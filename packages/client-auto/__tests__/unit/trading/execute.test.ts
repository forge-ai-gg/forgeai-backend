import { EnumTradeStatus, EnumTradeType } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import * as solanaUtils from "@/lib/solana.utils";
import { executeTradeDecisions } from "@/trading/execute";
import * as priceService from "@/trading/price-service";
import * as validation from "@/trading/validation";
import { TradingContext } from "@/types/trading-context";
import { TradeDecision } from "@/types/trading-decision";
import { Transaction } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    createBaseTradingContext,
    createMockPosition,
    createMockPriceHistory,
    mockTokens,
} from "../test-utils";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
    prisma: {
        transaction: {
            create: vi.fn(),
        },
        position: {
            create: vi.fn(),
            update: vi.fn(),
        },
    },
}));

vi.mock("@/lib/solana.utils", () => ({
    getSwapDetails: vi.fn(),
}));

vi.mock("@/trading/validation", () => ({
    validateTradeParameters: vi.fn(),
    validatePositionSize: vi.fn(),
}));

vi.mock("@/trading/price-service", () => ({
    getTokenPrices: vi.fn(),
}));

describe("executeTradeDecisions", () => {
    // Setup common test variables using test utilities
    const mockToken1 = mockTokens.token1;
    const mockToken2 = mockTokens.token2;

    // Add price and other properties needed for this test
    const mockToken1WithPrice = {
        ...mockToken1,
        price: { value: 1.2 },
        liquidity: { usd: 1000000 },
        volume: { h24: 500000 },
        trustScore: 80,
    };

    const mockToken2WithPrice = {
        ...mockToken2,
        price: { value: 2.2 },
        liquidity: { usd: 2000000 },
        volume: { h24: 800000 },
        trustScore: 90,
    };

    const mockPosition = createMockPosition({
        baseTokenAddress: mockToken2.address,
        baseTokenSymbol: mockToken2.symbol,
        baseTokenDecimals: mockToken2.decimals,
        baseTokenLogoURI: mockToken2.logoURI,
        quoteTokenAddress: mockToken1.address,
        quoteTokenSymbol: mockToken1.symbol,
        quoteTokenDecimals: mockToken1.decimals,
        quoteTokenLogoURI: mockToken1.logoURI,
        entryPrice: 1.8,
        totalBaseAmount: "50",
        averageEntryPrice: 1.8,
    });

    const mockTransaction: Transaction = {
        id: "transaction-1",
        strategyAssignmentId: "test-assignment-id",
        side: "BUY",
        status: EnumTradeStatus.OPEN,
        type: EnumTradeType.BUY,
        timestamp: new Date(),
        tokenFromAddress: mockToken1.address,
        tokenToAddress: mockToken2.address,
        tokenFromSymbol: mockToken1.symbol,
        tokenToSymbol: mockToken2.symbol,
        tokenFromAmount: "100",
        tokenToAmount: "45.45",
        tokenFromDecimals: mockToken1.decimals,
        tokenToDecimals: mockToken2.decimals,
        tokenFromLogoURI: mockToken1.logoURI,
        tokenToLogoURI: mockToken2.logoURI,
        tokenFromPrice: 1.2,
        tokenToPrice: 2.2,
        feesInUsd: 0,
        profitLossUsd: 0,
        profitLossPercentage: 0,
        transactionHash:
            "0000000000000000000000000000000000000000000000000000000000000000",
        failureReason: null,
        metadata: {},
        positionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: null,
    };

    // Use the utility function to create mock price history
    const mockPriceHistory = createMockPriceHistory(
        [mockToken1WithPrice, mockToken2WithPrice],
        2,
        1.0,
        0.2
    );

    const mockSwapDetails = {
        inputToken: mockToken1.address,
        inputAmount: 100,
        outputToken: mockToken2.address,
        outputAmount: 45.45,
        priceImpact: 0.1,
        executionPrice: 2.2,
        programId: "jupiter-program-id",
        isJupiterSwap: true,
        status: "success" as const,
    };

    const mockOpenTradeDecision: TradeDecision = {
        shouldOpen: true,
        shouldClose: false,
        tokenPair: {
            from: mockToken1WithPrice,
            to: mockToken2WithPrice,
        },
        amount: 100,
        strategyAssignmentId: "test-assignment-id",
        description: "Buy signal detected",
        position: undefined,
    };

    const mockCloseTradeDecision: TradeDecision = {
        shouldOpen: false,
        shouldClose: true,
        tokenPair: {
            from: mockToken2WithPrice,
            to: mockToken1WithPrice,
        },
        amount: 50,
        strategyAssignmentId: "test-assignment-id",
        description: "Sell signal detected",
        position: mockPosition,
    };

    // Use the utility function to create a base trading context
    const baseTradingContext = createBaseTradingContext(mockPriceHistory, []);

    // Extend the base context with specific properties needed for this test
    const mockTradingContext: Partial<TradingContext> = {
        ...baseTradingContext,
        tradeDecisions: [mockOpenTradeDecision, mockCloseTradeDecision],
        isPaperTrading: true,
        solanaAgent: {
            connection: {
                getTransaction: vi.fn().mockResolvedValue({}),
            } as any,
            trade: vi.fn().mockResolvedValue("mock-transaction-signature"),
        } as any,
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default mocks
        vi.mocked(validation.validateTradeParameters).mockResolvedValue({
            isValid: true,
            reason: "",
        });

        vi.mocked(validation.validatePositionSize).mockResolvedValue({
            isValid: true,
            reason: "",
        });

        vi.mocked(solanaUtils.getSwapDetails).mockResolvedValue(
            mockSwapDetails
        );

        vi.mocked(priceService.getTokenPrices).mockReturnValue({
            tokenFromPrice: mockToken1WithPrice.price.value,
            tokenToPrice: mockToken2WithPrice.price.value,
        });

        // Create mock Prisma client objects with proper implementation
        vi.mocked(prisma.transaction.create).mockResolvedValue(mockTransaction);

        vi.mocked(prisma.position.create).mockResolvedValue({
            ...mockPosition,
            Transaction: [mockTransaction],
        } as any);

        vi.mocked(prisma.position.update).mockResolvedValue(mockPosition);
    });

    it("should execute trade decisions that should open or close", async () => {
        // Act
        const results = await executeTradeDecisions(
            mockTradingContext as TradingContext
        );

        // Assert
        expect(results).toHaveLength(2);
        expect(results[0].success).toBe(true);
        expect(results[1].success).toBe(true);

        // Verify getSwapDetails was called for each trade
        expect(solanaUtils.getSwapDetails).toHaveBeenCalledTimes(2);

        // Verify position creation for opening trade
        expect(prisma.position.create).toHaveBeenCalledTimes(1);

        // Verify position update for closing trade
        expect(prisma.position.update).toHaveBeenCalledTimes(1);
    });

    it("should handle paper trading mode", async () => {
        // Act
        const results = await executeTradeDecisions(
            mockTradingContext as TradingContext
        );

        // Assert
        expect(results).toHaveLength(2);

        // Verify transaction hash is dummy for paper trading
        const calls = vi.mocked(solanaUtils.getSwapDetails).mock.calls;
        expect(calls[0][0].isPaperTrading).toBe(true);
        expect(calls[0][0].txHash).toBe(
            "0000000000000000000000000000000000000000000000000000000000000000"
        );
    });

    it("should handle validation failures", async () => {
        // Arrange
        vi.mocked(validation.validateTradeParameters).mockResolvedValueOnce({
            isValid: false,
            reason: "Insufficient liquidity",
        });

        // Act
        const results = await executeTradeDecisions(
            mockTradingContext as TradingContext
        );

        // Assert
        expect(results).toHaveLength(2);
        expect(results[0].success).toBe(false);
        expect(results[0].error).toBeDefined();
        if (results[0].error) {
            expect(results[0].error.message).toContain(
                "Trade validation failed"
            );
        }

        // Verify failed transaction is recorded
        expect(prisma.transaction.create).toHaveBeenCalledTimes(2);
        const createCall = vi.mocked(prisma.transaction.create).mock
            .calls[0][0];
        expect(createCall.data.status).toBe(EnumTradeStatus.FAILED);
    });

    it("should handle position size validation failures", async () => {
        // Arrange
        vi.mocked(validation.validatePositionSize).mockResolvedValueOnce({
            isValid: false,
            reason: "Position size too large",
        });

        // Act
        const results = await executeTradeDecisions(
            mockTradingContext as TradingContext
        );

        // Assert
        expect(results).toHaveLength(2);
        expect(results[0].success).toBe(false);
        expect(results[0].error).toBeDefined();
        if (results[0].error) {
            expect(results[0].error.message).toContain(
                "Position size validation failed"
            );
        }
    });

    it("should handle missing price history", async () => {
        // Arrange
        vi.mocked(priceService.getTokenPrices).mockImplementation(() => {
            throw new Error("Missing price history");
        });

        // Act
        const results = await executeTradeDecisions(
            mockTradingContext as TradingContext
        );

        // Assert
        expect(results).toHaveLength(2);
        expect(results[0].success).toBe(false);
        expect(results[0].error).toBeDefined();
        if (results[0].error) {
            expect(results[0].error.message).toContain("Missing price history");
        }
    });

    it("should handle missing token pair", async () => {
        // Arrange
        const invalidTradeDecision = {
            ...mockOpenTradeDecision,
            tokenPair: undefined as any,
        };

        const contextWithInvalidDecision = {
            ...mockTradingContext,
            tradeDecisions: [
                invalidTradeDecision as TradeDecision,
                mockCloseTradeDecision,
            ],
        };

        // Act
        const results = await executeTradeDecisions(
            contextWithInvalidDecision as TradingContext
        );

        // Assert
        expect(results).toHaveLength(2);
        expect(results[0].success).toBe(false);
        expect(results[0].error).toBeDefined();
        if (results[0].error) {
            expect(results[0].error.message).toContain("missing tokenPair");
        }
    });

    it("should calculate profit/loss for closed positions", async () => {
        // Act
        const results = await executeTradeDecisions(
            mockTradingContext as TradingContext
        );

        // Assert
        expect(results).toHaveLength(2);
        expect(results[1].success).toBe(true);

        // Verify position update for closing trade
        expect(prisma.position.update).toHaveBeenCalledTimes(1);
        const updateCall = vi.mocked(prisma.position.update).mock.calls[0][0];
        expect(updateCall.data.realizedPnlUsd).toBeDefined();
        expect(updateCall.data.status).toBe(EnumTradeStatus.CLOSED);
    });

    it("should handle swap details errors", async () => {
        // Arrange
        const swapError = new Error("Swap failed");
        vi.mocked(solanaUtils.getSwapDetails).mockRejectedValue(swapError);

        // Act
        const results = await executeTradeDecisions(
            mockTradingContext as TradingContext
        );

        // Assert
        expect(results[0].success).toBe(false);
        expect(results[0].error).toBeDefined();
        if (results[0].error) {
            expect(results[0].error.message).toBe("Swap failed");
        }
    });

    it("should handle empty trade decisions", async () => {
        // Arrange
        const contextWithNoDecisions = {
            ...mockTradingContext,
            tradeDecisions: [],
        };

        // Act
        const results = await executeTradeDecisions(
            contextWithNoDecisions as TradingContext
        );

        // Assert
        expect(results).toEqual([]);
        expect(solanaUtils.getSwapDetails).not.toHaveBeenCalled();
        expect(prisma.position.create).not.toHaveBeenCalled();
        expect(prisma.position.update).not.toHaveBeenCalled();
    });

    it("should handle trade decisions with no actions", async () => {
        // Arrange
        const noActionDecision = {
            ...mockOpenTradeDecision,
            shouldOpen: false,
            shouldClose: false,
        };

        const contextWithNoActionDecisions = {
            ...mockTradingContext,
            tradeDecisions: [noActionDecision],
        };

        // Act
        const results = await executeTradeDecisions(
            contextWithNoActionDecisions as TradingContext
        );

        // Assert
        expect(results).toEqual([]);
        expect(solanaUtils.getSwapDetails).not.toHaveBeenCalled();
        expect(prisma.position.create).not.toHaveBeenCalled();
        expect(prisma.position.update).not.toHaveBeenCalled();
    });
});
