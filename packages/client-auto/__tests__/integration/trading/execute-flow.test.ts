import {
    EnumPositionStatus,
    EnumStrategyType,
    EnumTradeStatus,
    EnumTradeType,
} from "@/lib/enums";
import * as getCharacterDetailsModule from "@/lib/get-character-details";
import { prisma } from "@/lib/prisma";
import * as solanaUtils from "@/lib/solana.utils";
import { initializeTradingContext } from "@/trading/context";
import {
    recordFailedTrade,
    recordSuccessfulTrade,
} from "@/trading/database-service";
import { executeTradeDecisions } from "@/trading/execute";
import * as priceService from "@/trading/price-service";
import { executeTransaction } from "@/trading/transaction-service";
import { TradingContext } from "@/types/trading-context";
import { TradeDecision } from "@/types/trading-decision";
import { IAgentRuntime } from "@elizaos/core";
import {
    AgentStrategyAssignment,
    AgentTradingStrategy,
    Position,
    Transaction,
} from "@prisma/client";
import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";
import {
    createMockPosition,
    createMockStrategyConfig,
    createTokenPairs,
    mockTokens,
} from "../../test-utils";

// Mock dependencies
vi.mock("@solana/web3.js", () => ({
    Connection: vi.fn().mockImplementation(() => ({
        // Add any Connection methods that might be used
        getTransaction: vi.fn().mockResolvedValue({}),
    })),
    PublicKey: vi.fn().mockImplementation((key) => ({ key })),
}));

// Mock SolanaAgentKit with a proper mock implementation
const mockTrade = vi.fn().mockResolvedValue({
    signature: "mock-transaction-signature",
    status: "success",
});

vi.mock("solana-agent-kit", () => {
    return {
        SolanaAgentKit: vi.fn().mockImplementation(() => ({
            trade: mockTrade,
        })),
    };
});

vi.mock("@/lib/prisma", () => ({
    prisma: {
        agentStrategyAssignment: {
            findFirstOrThrow: vi.fn(),
        },
        transaction: {
            create: vi.fn(),
        },
        position: {
            create: vi.fn(),
            update: vi.fn(),
            findFirst: vi.fn(),
        },
    },
}));

vi.mock("@/lib/get-character-details", () => ({
    getAgentWalletDetails: vi.fn(),
}));

vi.mock("@/lib/solana.utils", () => ({
    getSwapDetails: vi.fn(),
}));

vi.mock("@/trading/price-service", () => ({
    getTokenPrices: vi.fn(),
}));

// Add mock for transaction service
vi.mock("@/trading/transaction-service", () => ({
    executeTransaction: vi.fn(),
}));

// Add mock for database service
vi.mock("@/trading/database-service", () => ({
    recordSuccessfulTrade: vi
        .fn()
        .mockImplementation(({ decision, txHash, swapDetails }) => {
            // For opening positions
            if (decision.shouldOpen) {
                return Promise.resolve({
                    transaction: {
                        id: "test-transaction-id",
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        strategyAssignmentId: decision.strategyAssignmentId,
                        status: "pending",
                        side: "buy",
                        metadata: {
                            reason: decision.description,
                        },
                        userId: null,
                        timestamp: new Date(),
                        baseTokenAddress: decision.tokenPair.from.address,
                        baseTokenSymbol: decision.tokenPair.from.symbol,
                        quoteTokenAddress: decision.tokenPair.to.address,
                        quoteTokenSymbol: decision.tokenPair.to.symbol,
                        baseAmount: String(decision.amount),
                        quoteAmount: String(swapDetails?.outputAmount || 0),
                        txHash,
                        agentId: "test-agent-id",
                        positionId: "test-position-id",
                    },
                    position: {
                        id: "test-position-id",
                        strategyAssignmentId: decision.strategyAssignmentId,
                        status: "open",
                        baseTokenAddress: decision.tokenPair.to.address,
                        baseTokenSymbol: decision.tokenPair.to.symbol,
                        quoteTokenAddress: decision.tokenPair.from.address,
                        quoteTokenSymbol: decision.tokenPair.from.symbol,
                        totalBaseAmount: String(swapDetails?.outputAmount || 0),
                        openedAt: new Date(),
                        closedAt: null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                });
            }
            // For closing positions
            else if (decision.shouldClose && decision.position) {
                return Promise.resolve({
                    transaction: {
                        id: "test-transaction-id",
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        strategyAssignmentId: decision.strategyAssignmentId,
                        status: "pending",
                        side: "sell",
                        metadata: {
                            reason: decision.description,
                        },
                        userId: null,
                        timestamp: new Date(),
                        baseTokenAddress: decision.tokenPair.from.address,
                        baseTokenSymbol: decision.tokenPair.from.symbol,
                        quoteTokenAddress: decision.tokenPair.to.address,
                        quoteTokenSymbol: decision.tokenPair.to.symbol,
                        baseAmount: String(decision.amount),
                        quoteAmount: String(swapDetails?.outputAmount || 0),
                        txHash,
                        agentId: "test-agent-id",
                        positionId: decision.position.id,
                    },
                    position: {
                        ...decision.position,
                        status: "closed",
                        closedAt: new Date(),
                        updatedAt: new Date(),
                    },
                });
            }
            return Promise.resolve({ transaction: null, position: null });
        }),
    recordFailedTrade: vi
        .fn()
        .mockImplementation(() =>
            Promise.resolve({ id: "test-transaction-id" })
        ),
}));

// Import after mocking
const { SolanaAgentKit } = await import("solana-agent-kit");

describe("Trading Execution Flow Integration", () => {
    // Setup common test variables
    const mockRuntime = {
        character: {
            id: "test-agent-id",
            settings: {
                secrets: {
                    SOLANA_PRIVATE_KEY: "encrypted-private-key",
                    SOLANA_WALLET_PUBLIC_KEY: "test-public-key",
                },
            },
        },
    } as unknown as IAgentRuntime;

    const mockCycle = 1;

    // Use a valid base58 string for the private key
    const mockPrivateKey =
        "5MaiiCavjCmn9Hs1o3eznqDEhRwxo7pXiAYez7keQUviUkauRiTMD8DrESdrNjN8zd9mTmVhRvBJeg5vhyvgrAhG";
    const mockPublicKey = "test-public-key";

    // Use token pairs from test-utils
    const tokenPairs = createTokenPairs();
    const mockToken1 = {
        ...mockTokens.token1,
        price: { value: 1.2 },
        liquidity: { usd: 1000000 },
        volume: { h24: 500000 },
        trustScore: 80,
    };

    const mockToken2 = {
        ...mockTokens.token2,
        price: { value: 0.5 },
        liquidity: { usd: 800000 },
        volume: { h24: 300000 },
        trustScore: 75,
    };

    const mockAgentTradingStrategy = {
        id: "test-strategy-id",
        title: "Test Strategy",
        shortDescription: "Test strategy description",
        longDescription: "Test strategy long description",
        organizationId: "test-org-id",
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: "test-user-id",
        updatedById: "test-user-id",
        class: "trading",
        subclass: "rsi",
        defaultConfig: {} as any,
    } as AgentTradingStrategy;

    // Use createMockStrategyConfig from test-utils
    const mockTradingStrategyConfig = createMockStrategyConfig(
        EnumStrategyType.RSI,
        [{ from: mockToken1, to: mockToken2 }]
    );

    const mockAgentStrategyAssignment = {
        id: "test-assignment-id",
        agentId: "test-agent-id",
        strategyId: "test-strategy-id",
        isActive: true,
        isPaperTrading: true, // Using paper trading for integration tests
        config: mockTradingStrategyConfig as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: "test-user-id",
        updatedById: "test-user-id",
        startDate: new Date(),
        endDate: new Date(),
    } as AgentStrategyAssignment;

    // Create trade decisions for opening and closing positions
    const openTradeDecision: TradeDecision = {
        shouldOpen: true,
        shouldClose: false,
        amount: 100,
        description: "RSI is oversold",
        tokenPair: {
            from: mockToken1,
            to: mockToken2,
        },
        strategyAssignmentId: "test-assignment-id",
    };

    const closeTradeDecision: TradeDecision = {
        shouldOpen: false,
        shouldClose: true,
        amount: 100,
        description: "RSI is overbought",
        tokenPair: {
            from: mockToken2,
            to: mockToken1,
        },
        strategyAssignmentId: "test-assignment-id",
    };

    // Use createMockPosition from test-utils
    const mockPosition = createMockPosition({
        id: "test-position-id",
        strategyAssignmentId: "test-assignment-id",
        baseTokenAddress: mockToken2.address,
        baseTokenSymbol: mockToken2.symbol,
        quoteTokenAddress: mockToken1.address,
        quoteTokenSymbol: mockToken1.symbol,
        totalBaseAmount: "100",
        status: EnumPositionStatus.OPEN,
    }) as unknown as Position;

    // Mock transaction with the correct interface
    const mockTransaction = {
        id: "test-transaction-id",
        createdAt: new Date(),
        updatedAt: new Date(),
        strategyAssignmentId: "test-assignment-id",
        status: EnumTradeStatus.PENDING,
        side: EnumTradeType.BUY,
        metadata: {
            reason: "RSI is oversold",
        },
        userId: null,
        timestamp: new Date(),
        baseTokenAddress: mockToken1.address,
        baseTokenSymbol: mockToken1.symbol,
        quoteTokenAddress: mockToken2.address,
        quoteTokenSymbol: mockToken2.symbol,
        baseAmount: "100",
        quoteAmount: "200",
        txHash: "mock-transaction-signature",
        agentId: "test-agent-id",
        positionId: "test-position-id",
    } as unknown as Transaction;

    let tradingContext: TradingContext;

    beforeAll(async () => {
        // Setup mocks that should persist throughout all tests
        vi.mocked(
            getCharacterDetailsModule.getAgentWalletDetails
        ).mockResolvedValue({
            privateKey: mockPrivateKey,
            publicKey: mockPublicKey,
        });

        vi.mocked(
            prisma.agentStrategyAssignment.findFirstOrThrow
        ).mockResolvedValue({
            ...mockAgentStrategyAssignment,
            AgentTradingStrategy: mockAgentTradingStrategy,
        } as any);

        vi.mocked(solanaUtils.getSwapDetails).mockResolvedValue({
            inputToken: mockToken1.address,
            inputAmount: 100,
            outputToken: mockToken2.address,
            outputAmount: 200,
            programId: "jupiter-program-id",
            isJupiterSwap: true,
            status: "success",
        });

        vi.mocked(priceService.getTokenPrices).mockReturnValue({
            tokenFromPrice: mockToken1.price.value,
            tokenToPrice: mockToken2.price.value,
        });

        // Initialize the trading context once for all tests
        tradingContext = await initializeTradingContext({
            runtime: mockRuntime,
            cycle: mockCycle,
        });

        // Add connection to the solanaAgent
        tradingContext.solanaAgent = {
            ...tradingContext.solanaAgent,
            connection: {
                getTransaction: vi.fn().mockResolvedValue({}),
            },
            trade: mockTrade,
        } as any;
    });

    beforeEach(() => {
        // Reset mocks that should be reset between tests
        vi.clearAllMocks();

        // Setup default mocks for each test
        vi.mocked(prisma.transaction.create).mockResolvedValue(mockTransaction);
        vi.mocked(prisma.position.create).mockResolvedValue(mockPosition);
        vi.mocked(prisma.position.update).mockResolvedValue({
            ...mockPosition,
            totalQuoteAmount: "200",
        } as unknown as Position);
        vi.mocked(prisma.position.findFirst).mockResolvedValue(null);

        // Reset the mockTrade function
        mockTrade.mockClear();
        mockTrade.mockResolvedValue({
            signature: "mock-transaction-signature",
            status: "success",
        });

        // Reset transaction service mock
        vi.mocked(executeTransaction).mockResolvedValue(
            "mock-transaction-signature"
        );

        // Reset price service mock
        vi.mocked(priceService.getTokenPrices).mockReturnValue({
            tokenFromPrice: mockToken1.price.value,
            tokenToPrice: mockToken2.price.value,
        });
    });

    afterAll(() => {
        vi.resetAllMocks();
    });

    describe("Open Position Tests", () => {
        it("should execute a buy trade decision and create a new position", async () => {
            // Arrange
            const tradeDecisions = [openTradeDecision];

            // Update the trading context with the trade decisions
            const ctxWithDecisions = {
                ...tradingContext,
                tradeDecisions,
            };

            // Act
            const result = await executeTradeDecisions(ctxWithDecisions);

            // Assert
            expect(solanaUtils.getSwapDetails).toHaveBeenCalled();
            expect(recordSuccessfulTrade).toHaveBeenCalledWith(
                expect.objectContaining({
                    decision: openTradeDecision,
                    txHash: expect.any(String),
                })
            );

            expect(result[0]).toEqual(
                expect.objectContaining({
                    success: true,
                    transaction: expect.any(Object),
                    position: expect.any(Object),
                })
            );
        });

        it("should handle errors when opening a position", async () => {
            // Arrange
            const tradeDecisions = [openTradeDecision];
            const mockError = new Error("Failed to execute trade");

            // Update the trading context with the trade decisions
            const ctxWithDecisions = {
                ...tradingContext,
                tradeDecisions,
            };

            // Mock the transaction service to throw an error
            vi.mocked(executeTransaction).mockRejectedValueOnce(mockError);

            // Mock the transaction create to ensure it's not called
            vi.mocked(prisma.transaction.create).mockClear();
            vi.mocked(prisma.position.create).mockClear();

            // Act
            const result = await executeTradeDecisions(ctxWithDecisions);

            // Assert
            expect(result[0]).toEqual({
                transaction: null,
                success: false,
                error: mockError,
                errorContext: "trade execution",
            });

            // Verify no position creation was performed
            expect(prisma.position.create).not.toHaveBeenCalled();

            // Verify recordFailedTrade was called
            expect(recordFailedTrade).toHaveBeenCalledWith(
                expect.objectContaining({
                    decision: openTradeDecision,
                    error: mockError,
                })
            );
        });
    });

    describe("Close Position Tests", () => {
        it("should execute a sell trade decision and close an existing position", async () => {
            // Arrange
            // Add position to the trade decision
            const closeTradeDecisionWithPosition = {
                ...closeTradeDecision,
                position: mockPosition,
            };

            const tradeDecisions = [closeTradeDecisionWithPosition];

            // Update the trading context with the trade decisions
            const ctxWithDecisions = {
                ...tradingContext,
                tradeDecisions,
            };

            // Mock an existing position
            vi.mocked(prisma.position.findFirst).mockResolvedValue(
                mockPosition
            );

            // Act
            const result = await executeTradeDecisions(ctxWithDecisions);

            // Assert
            expect(solanaUtils.getSwapDetails).toHaveBeenCalled();
            expect(recordSuccessfulTrade).toHaveBeenCalledWith(
                expect.objectContaining({
                    decision: closeTradeDecisionWithPosition,
                    txHash: expect.any(String),
                })
            );

            expect(result[0]).toEqual(
                expect.objectContaining({
                    success: true,
                    transaction: expect.any(Object),
                    position: expect.any(Object),
                })
            );
        });

        it("should handle errors when closing a position", async () => {
            // Arrange
            // Add position to the trade decision
            const closeTradeDecisionWithPosition = {
                ...closeTradeDecision,
                position: mockPosition,
            };

            const tradeDecisions = [closeTradeDecisionWithPosition];
            const mockError = new Error("Failed to execute trade");

            // Update the trading context with the trade decisions
            const ctxWithDecisions = {
                ...tradingContext,
                tradeDecisions,
            };

            // Mock an existing position
            vi.mocked(prisma.position.findFirst).mockResolvedValue(
                mockPosition
            );

            // Mock the transaction service to throw an error
            vi.mocked(executeTransaction).mockRejectedValueOnce(mockError);

            // Mock the transaction create to ensure it's not called
            vi.mocked(prisma.transaction.create).mockClear();
            vi.mocked(prisma.position.update).mockClear();

            // Act
            const result = await executeTradeDecisions(ctxWithDecisions);

            // Assert
            expect(result[0]).toEqual({
                transaction: null,
                success: false,
                error: mockError,
                errorContext: "trade execution",
            });

            // Verify no position update was performed
            expect(prisma.position.update).not.toHaveBeenCalled();

            // Verify recordFailedTrade was called
            expect(recordFailedTrade).toHaveBeenCalledWith(
                expect.objectContaining({
                    decision: closeTradeDecisionWithPosition,
                    error: mockError,
                })
            );
        });
    });

    describe("Independent Open Position Test", () => {
        it("should open a position independently", async () => {
            // Arrange
            const tradeDecisions = [openTradeDecision];

            // Reset mocks to ensure test isolation
            vi.clearAllMocks();

            // Setup specific mocks for this test
            vi.mocked(executeTransaction).mockResolvedValue(
                "mock-transaction-signature"
            );
            vi.mocked(solanaUtils.getSwapDetails).mockResolvedValue({
                inputToken: mockToken1.address,
                inputAmount: 100,
                outputToken: mockToken2.address,
                outputAmount: 200,
                programId: "jupiter-program-id",
                isJupiterSwap: true,
                status: "success",
            });
            vi.mocked(priceService.getTokenPrices).mockReturnValue({
                tokenFromPrice: mockToken1.price.value,
                tokenToPrice: mockToken2.price.value,
            });

            // Update the trading context with the trade decisions
            const ctxWithDecisions = {
                ...tradingContext,
                tradeDecisions,
            };

            // Act
            const result = await executeTradeDecisions(ctxWithDecisions);

            // Assert
            expect(executeTransaction).toHaveBeenCalled();
            expect(solanaUtils.getSwapDetails).toHaveBeenCalled();
            expect(recordSuccessfulTrade).toHaveBeenCalledWith(
                expect.objectContaining({
                    decision: openTradeDecision,
                    txHash: expect.any(String),
                })
            );

            expect(result[0]).toEqual(
                expect.objectContaining({
                    success: true,
                    transaction: expect.any(Object),
                    position: expect.any(Object),
                })
            );
        });
    });

    describe("Independent Close Position Test", () => {
        it("should close a position independently", async () => {
            // Arrange
            // Add position to the trade decision
            const closeTradeDecisionWithPosition = {
                ...closeTradeDecision,
                position: mockPosition,
            };

            // Reset mocks to ensure test isolation
            vi.clearAllMocks();

            // Setup specific mocks for this test
            vi.mocked(prisma.position.findFirst).mockResolvedValue(
                mockPosition
            );
            vi.mocked(executeTransaction).mockResolvedValue(
                "mock-transaction-signature"
            );
            vi.mocked(solanaUtils.getSwapDetails).mockResolvedValue({
                inputToken: mockToken2.address,
                inputAmount: 100,
                outputToken: mockToken1.address,
                outputAmount: 200,
                programId: "jupiter-program-id",
                isJupiterSwap: true,
                status: "success",
            });
            vi.mocked(priceService.getTokenPrices).mockReturnValue({
                tokenFromPrice: mockToken2.price.value,
                tokenToPrice: mockToken1.price.value,
            });

            const tradeDecisions = [closeTradeDecisionWithPosition];

            // Update the trading context with the trade decisions
            const ctxWithDecisions = {
                ...tradingContext,
                tradeDecisions,
            };

            // Act
            const result = await executeTradeDecisions(ctxWithDecisions);

            // Assert
            expect(executeTransaction).toHaveBeenCalled();
            expect(solanaUtils.getSwapDetails).toHaveBeenCalled();
            expect(recordSuccessfulTrade).toHaveBeenCalledWith(
                expect.objectContaining({
                    decision: closeTradeDecisionWithPosition,
                    txHash: expect.any(String),
                })
            );

            expect(result[0]).toEqual(
                expect.objectContaining({
                    success: true,
                    transaction: expect.any(Object),
                    position: expect.any(Object),
                })
            );
        });
    });
});
