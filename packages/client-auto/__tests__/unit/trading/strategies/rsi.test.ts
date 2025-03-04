import * as constants from "@/lib/constants";
import { EnumStrategyType } from "@/lib/enums";
import {
    evaluateRsiStrategy,
    generateRsiTradeReason,
} from "@/trading/strategies/rsi";
import { WalletPortfolioItem } from "@/types/birdeye/api/wallet";
import { TradingContext } from "@/types/trading-context";
import {
    TokenPair,
    TradingStrategyConfig,
} from "@/types/trading-strategy-config";
import { rsi } from "technicalindicators";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the technicalindicators library
vi.mock("technicalindicators", () => {
    return {
        rsi: vi.fn().mockReturnValue([30]),
    };
});

// Import after mocking

// Cast the mocked function to the correct type
const mockRsi = rsi as unknown as ReturnType<typeof vi.fn>;

describe("RSI Strategy", () => {
    // Define test tokens
    const mockToken1 = {
        address: "token-address-1",
        symbol: "TEST1",
        logoURI: "test-logo-uri-1",
        decimals: 9,
        network: "solana",
    };

    const mockToken2 = {
        address: "token-address-2",
        symbol: "TEST2",
        logoURI: "test-logo-uri-2",
        decimals: 6,
        network: "solana",
    };

    // Define token pair
    const mockTokenPair: TokenPair = {
        from: mockToken1,
        to: mockToken2,
    };

    // Define mock price history
    const mockPriceHistory = {
        [mockToken1.address]: {
            token: mockToken1,
            prices: Array(10)
                .fill(0)
                .map((_, i) => ({
                    unixTime: Date.now() / 1000 - (9 - i) * 3600,
                    value: 100 + i,
                    address: mockToken1.address,
                })),
        },
        [mockToken2.address]: {
            token: mockToken2,
            prices: Array(10)
                .fill(0)
                .map((_, i) => ({
                    unixTime: Date.now() / 1000 - (9 - i) * 3600,
                    value: 10 + i,
                    address: mockToken2.address,
                })),
        },
    };

    // Define mock trading strategy config
    const mockTradingStrategyConfig: TradingStrategyConfig = {
        title: "Test RSI Strategy",
        type: EnumStrategyType.RSI,
        tokenPairs: [mockTokenPair],
        timeInterval: "1h", // Using string literal instead of enum
        maxPortfolioAllocation: 20, // 20% of portfolio
        rsiConfig: {
            length: 14,
            overBought: 70,
            overSold: 30,
        },
    };

    // Define mock wallet portfolio items
    const mockWalletPortfolioItems: WalletPortfolioItem[] = [
        {
            address: mockToken1.address,
            symbol: mockToken1.symbol,
            logoURI: mockToken1.logoURI,
            decimals: mockToken1.decimals,
            balance: "1000",
            uiAmount: 1000,
            chainId: "solana",
            priceUsd: 100,
            valueUsd: 100000,
        },
        {
            address: mockToken2.address,
            symbol: mockToken2.symbol,
            logoURI: mockToken2.logoURI,
            decimals: mockToken2.decimals,
            balance: "500",
            uiAmount: 500,
            chainId: "solana",
            priceUsd: 10,
            valueUsd: 5000,
        },
    ];

    // Base trading context for tests
    const baseTradingContext: TradingContext = {
        cycle: 1,
        publicKey: "test-public-key",
        privateKey: "test-private-key",
        portfolio: {
            openPositions: [],
            walletPortfolioItems: mockWalletPortfolioItems,
            totalValue: 105000,
        },
        priceHistory: mockPriceHistory,
        agentTradingStrategy: {
            id: "test-strategy-id",
            title: "Test Strategy",
            description: "Test strategy description",
            config: JSON.stringify(mockTradingStrategyConfig),
            createdAt: new Date(),
            updatedAt: new Date(),
        } as any,
        agentStrategyAssignment: {
            id: "test-assignment-id",
            agentId: "test-agent-id",
            agentTradingStrategyId: "test-strategy-id",
            createdAt: new Date(),
            updatedAt: new Date(),
        } as any,
        tradingStrategyConfig: mockTradingStrategyConfig,
        isPaperTrading: true,
    };

    // Reset mocks before each test
    beforeEach(() => {
        vi.clearAllMocks();
        // Set default RSI value
        mockRsi.mockReturnValue([30]);
        // Reset the force constants
        vi.spyOn(constants, "FORCE_OPEN_POSITION", "get").mockReturnValue(
            false
        );
        vi.spyOn(constants, "FORCE_CLOSE_POSITION", "get").mockReturnValue(
            false
        );
    });

    describe("evaluateRsiStrategy", () => {
        it("should recommend opening a position when RSI is below overSold threshold", () => {
            // Mock RSI value below overSold threshold
            mockRsi.mockReturnValue([25]);

            const result = evaluateRsiStrategy({
                ctx: baseTradingContext,
                pair: mockTokenPair,
                amount: 100,
            });

            expect(result.shouldOpen).toBe(true);
            expect(result.shouldClose).toBe(false);
            expect(result.hasOpenPosition).toBe(false);
            expect(result.openProximity).toBeGreaterThan(0);
            expect(result.closeProximity).toBe(0);
        });

        it("should not recommend opening a position when RSI is above overSold threshold", () => {
            // Mock RSI value above overSold threshold
            mockRsi.mockReturnValue([40]);

            const result = evaluateRsiStrategy({
                ctx: baseTradingContext,
                pair: mockTokenPair,
                amount: 100,
            });

            expect(result.shouldOpen).toBe(false);
            expect(result.shouldClose).toBe(false);
            expect(result.hasOpenPosition).toBe(false);
            expect(result.openProximity).toBe(0);
            expect(result.closeProximity).toBe(0);
        });

        it("should recommend closing a position when RSI is above overBought threshold", () => {
            // Mock RSI value above overBought threshold
            mockRsi.mockReturnValue([75]);

            // Create context with an open position
            const contextWithOpenPosition: TradingContext = {
                ...baseTradingContext,
                portfolio: {
                    ...baseTradingContext.portfolio!,
                    openPositions: [
                        {
                            id: "test-position-id",
                            baseTokenAddress: mockToken2.address,
                            quoteTokenAddress: mockToken1.address,
                            baseTokenSymbol: mockToken2.symbol,
                            quoteTokenSymbol: mockToken1.symbol,
                            baseTokenAmount: "100",
                            quoteTokenAmount: "1000",
                            openPrice: 10,
                            status: "OPEN",
                            agentStrategyAssignmentId: "test-assignment-id",
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            closedAt: null,
                            closePrice: null,
                            pnl: null,
                            pnlPercentage: null,
                            totalBaseAmount: "100",
                            totalQuoteAmount: "1000",
                        } as any,
                    ],
                },
            };

            const result = evaluateRsiStrategy({
                ctx: contextWithOpenPosition,
                pair: mockTokenPair,
                amount: 100,
            });

            expect(result.shouldOpen).toBe(false);
            expect(result.shouldClose).toBe(true);
            expect(result.hasOpenPosition).toBe(true);
            expect(result.openProximity).toBe(0);
            expect(result.closeProximity).toBeGreaterThan(0);
        });

        it("should not recommend closing a position when RSI is below overBought threshold", () => {
            // Mock RSI value below overBought threshold
            mockRsi.mockReturnValue([60]);

            // Create context with an open position
            const contextWithOpenPosition: TradingContext = {
                ...baseTradingContext,
                portfolio: {
                    ...baseTradingContext.portfolio!,
                    openPositions: [
                        {
                            id: "test-position-id",
                            baseTokenAddress: mockToken2.address,
                            quoteTokenAddress: mockToken1.address,
                            baseTokenSymbol: mockToken2.symbol,
                            quoteTokenSymbol: mockToken1.symbol,
                            baseTokenAmount: "100",
                            quoteTokenAmount: "1000",
                            openPrice: 10,
                            status: "OPEN",
                            agentStrategyAssignmentId: "test-assignment-id",
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            closedAt: null,
                            closePrice: null,
                            pnl: null,
                            pnlPercentage: null,
                            totalBaseAmount: "100",
                            totalQuoteAmount: "1000",
                        } as any,
                    ],
                },
            };

            const result = evaluateRsiStrategy({
                ctx: contextWithOpenPosition,
                pair: mockTokenPair,
                amount: 100,
            });

            expect(result.shouldOpen).toBe(false);
            expect(result.shouldClose).toBe(false);
            expect(result.hasOpenPosition).toBe(true);
            expect(result.openProximity).toBe(0);
            expect(result.closeProximity).toBe(0);
        });

        it("should force open a position when FORCE_OPEN_POSITION is true", () => {
            // Mock RSI value above overSold threshold (would normally not open)
            mockRsi.mockReturnValue([40]);

            // Set FORCE_OPEN_POSITION to true
            const forceSpy = vi.spyOn(constants, "FORCE_OPEN_POSITION", "get");
            // @ts-ignore - Intentionally mocking with a different value for testing
            forceSpy.mockReturnValue(true);

            const result = evaluateRsiStrategy({
                ctx: baseTradingContext,
                pair: mockTokenPair,
                amount: 100,
            });

            expect(result.shouldOpen).toBe(true);
            expect(result.shouldClose).toBe(false);
        });

        it("should force close a position when FORCE_CLOSE_POSITION is true", () => {
            // Mock RSI value below overBought threshold (would normally not close)
            mockRsi.mockReturnValue([60]);

            // Set FORCE_CLOSE_POSITION to true
            const forceSpy = vi.spyOn(constants, "FORCE_CLOSE_POSITION", "get");
            // @ts-ignore - Intentionally mocking with a different value for testing
            forceSpy.mockReturnValue(true);

            // Create context with an open position
            const contextWithOpenPosition: TradingContext = {
                ...baseTradingContext,
                portfolio: {
                    ...baseTradingContext.portfolio!,
                    openPositions: [
                        {
                            id: "test-position-id",
                            baseTokenAddress: mockToken2.address,
                            quoteTokenAddress: mockToken1.address,
                            baseTokenSymbol: mockToken2.symbol,
                            quoteTokenSymbol: mockToken1.symbol,
                            baseTokenAmount: "100",
                            quoteTokenAmount: "1000",
                            openPrice: 10,
                            status: "OPEN",
                            agentStrategyAssignmentId: "test-assignment-id",
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            closedAt: null,
                            closePrice: null,
                            pnl: null,
                            pnlPercentage: null,
                            totalBaseAmount: "100",
                            totalQuoteAmount: "1000",
                        } as any,
                    ],
                },
            };

            const result = evaluateRsiStrategy({
                ctx: contextWithOpenPosition,
                pair: mockTokenPair,
                amount: 100,
            });

            expect(result.shouldOpen).toBe(false);
            expect(result.shouldClose).toBe(true);
        });

        it("should calculate openProximity correctly", () => {
            // Test with different RSI values to check proximity calculation
            const testCases = [
                { rsi: 10, expectedProximity: 0.67 }, // (30 - 10) / 30 = 0.67
                { rsi: 20, expectedProximity: 0.33 }, // (30 - 20) / 30 = 0.33
                { rsi: 25, expectedProximity: 0.17 }, // (30 - 25) / 30 = 0.17
                { rsi: 30, expectedProximity: 0 }, // At threshold, no proximity
                { rsi: 35, expectedProximity: 0 }, // Above threshold, no proximity
            ];

            for (const testCase of testCases) {
                mockRsi.mockReturnValue([testCase.rsi]);

                const result = evaluateRsiStrategy({
                    ctx: baseTradingContext,
                    pair: mockTokenPair,
                    amount: 100,
                });

                expect(result.openProximity).toBeCloseTo(
                    testCase.expectedProximity,
                    1
                );
            }
        });

        it("should calculate closeProximity correctly", () => {
            // Create context with an open position
            const contextWithOpenPosition: TradingContext = {
                ...baseTradingContext,
                portfolio: {
                    ...baseTradingContext.portfolio!,
                    openPositions: [
                        {
                            id: "test-position-id",
                            baseTokenAddress: mockToken2.address,
                            quoteTokenAddress: mockToken1.address,
                            baseTokenSymbol: mockToken2.symbol,
                            quoteTokenSymbol: mockToken1.symbol,
                            baseTokenAmount: "100",
                            quoteTokenAmount: "1000",
                            openPrice: 10,
                            status: "OPEN",
                            agentStrategyAssignmentId: "test-assignment-id",
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            closedAt: null,
                            closePrice: null,
                            pnl: null,
                            pnlPercentage: null,
                            totalBaseAmount: "100",
                            totalQuoteAmount: "1000",
                        } as any,
                    ],
                },
            };

            // Test with different RSI values to check proximity calculation
            const testCases = [
                { rsi: 70, expectedProximity: 0 }, // At threshold, no proximity
                { rsi: 75, expectedProximity: 0.17 }, // (75 - 70) / (100 - 70) = 0.17
                { rsi: 80, expectedProximity: 0.33 }, // (80 - 70) / (100 - 70) = 0.33
                { rsi: 90, expectedProximity: 0.67 }, // (90 - 70) / (100 - 70) = 0.67
                { rsi: 65, expectedProximity: 0 }, // Below threshold, no proximity
            ];

            for (const testCase of testCases) {
                mockRsi.mockReturnValue([testCase.rsi]);

                const result = evaluateRsiStrategy({
                    ctx: contextWithOpenPosition,
                    pair: mockTokenPair,
                    amount: 100,
                });

                expect(result.closeProximity).toBeCloseTo(
                    testCase.expectedProximity,
                    1
                );
            }
        });
    });

    describe("generateRsiTradeReason", () => {
        it("should generate a reason with RSI value and position status", () => {
            // Mock RSI value
            mockRsi.mockReturnValue([42]);

            const reason = generateRsiTradeReason(
                baseTradingContext,
                mockTokenPair
            );
            expect(reason).toBe("RSI at 42 with no position");
        });

        it("should indicate open position in the reason", () => {
            // Mock RSI value
            mockRsi.mockReturnValue([42]);

            // Create context with an open position
            const contextWithOpenPosition: TradingContext = {
                ...baseTradingContext,
                portfolio: {
                    ...baseTradingContext.portfolio!,
                    openPositions: [
                        {
                            id: "test-position-id",
                            baseTokenAddress: mockToken2.address,
                            quoteTokenAddress: mockToken1.address,
                            baseTokenSymbol: mockToken2.symbol,
                            quoteTokenSymbol: mockToken1.symbol,
                            baseTokenAmount: "100",
                            quoteTokenAmount: "1000",
                            openPrice: 10,
                            status: "OPEN",
                            agentStrategyAssignmentId: "test-assignment-id",
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            closedAt: null,
                            closePrice: null,
                            pnl: null,
                            pnlPercentage: null,
                            totalBaseAmount: "100",
                            totalQuoteAmount: "1000",
                        } as any,
                    ],
                },
            };

            const reason = generateRsiTradeReason(
                contextWithOpenPosition,
                mockTokenPair
            );
            expect(reason).toBe("RSI at 42 with open position");
        });

        it("should return 'Insufficient data' when price history or portfolio is missing", () => {
            const incompleteContext: TradingContext = {
                ...baseTradingContext,
                priceHistory: undefined,
            };

            const reason = generateRsiTradeReason(
                incompleteContext,
                mockTokenPair
            );
            expect(reason).toBe("Insufficient data");
        });
    });
});
