import { EnumStrategyType } from "@/lib/enums";
import { evaluateTradeDecisions } from "@/trading/evaluate";
import * as strategyModule from "@/trading/strategy";
import { TokenPair } from "@/types/trading-strategy-config";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    createBaseTradingContext,
    createMockPosition,
    createMockPriceHistory,
    createMockStrategyConfig,
    createTokenPairs,
    mockTokens,
} from "../test-utils";

// Define a type for tokens in our tests
type TestToken = {
    address: string;
    symbol: string;
    logoURI: string;
    decimals: number;
    network: string;
};

// Mock dependencies
vi.mock("@/trading/strategy", () => ({
    calculateTradeAmount: vi.fn(),
    evaluateStrategy: vi.fn(),
}));

describe("evaluateTradeDecisions", () => {
    // Setup token pairs using test utilities
    const tokenPairs = createTokenPairs();

    // Create a third token and pair for testing multiple pairs
    const mockToken3 = {
        address: "token-address-3",
        symbol: "TEST3",
        logoURI: "test-logo-uri-3",
        decimals: 8,
        network: "solana",
    };

    const mockTokenPair2: TokenPair = {
        from: mockTokens.token2,
        to: mockToken3,
    };

    // Create a strategy config with multiple token pairs
    const mockTradingStrategyConfig = createMockStrategyConfig(
        EnumStrategyType.RSI,
        [tokenPairs.pair1, mockTokenPair2]
    );

    // Create price history with all three tokens
    const mockPriceHistory = createMockPriceHistory(
        [mockTokens.token1, mockTokens.token2, mockToken3],
        2,
        1.0,
        0.2
    );

    // Create a mock position for testing
    const mockPosition = createMockPosition({
        baseTokenAddress: mockToken3.address,
        baseTokenSymbol: mockToken3.symbol,
        baseTokenDecimals: mockToken3.decimals,
        baseTokenLogoURI: mockToken3.logoURI,
        quoteTokenAddress: mockTokens.token2.address,
        quoteTokenSymbol: mockTokens.token2.symbol,
        quoteTokenDecimals: mockTokens.token2.decimals,
        quoteTokenLogoURI: mockTokens.token2.logoURI,
        entryPrice: 1.8,
        exitPrice: null,
        totalBaseAmount: "10",
        averageEntryPrice: 1.8,
    });

    // Create a base trading context for testing
    const mockTradingContext = createBaseTradingContext(mockPriceHistory, []);

    // Update the trading context with our specific test configuration
    mockTradingContext.tradingStrategyConfig = mockTradingStrategyConfig;

    // Update the portfolio with our specific test wallet items
    if (mockTradingContext.portfolio) {
        mockTradingContext.portfolio.walletPortfolioItems = [
            {
                address: mockTokens.token1.address,
                symbol: mockTokens.token1.symbol,
                name: "Test Token 1",
                decimals: mockTokens.token1.decimals,
                balance: "100000000000",
                uiAmount: 100,
                chainId: "solana",
                logoURI: mockTokens.token1.logoURI,
                priceUsd: 1.2,
                valueUsd: 120,
            },
            {
                address: mockTokens.token2.address,
                symbol: mockTokens.token2.symbol,
                name: "Test Token 2",
                decimals: mockTokens.token2.decimals,
                balance: "50000000",
                uiAmount: 50,
                chainId: "solana",
                logoURI: mockTokens.token2.logoURI,
                priceUsd: 2.2,
                valueUsd: 110,
            },
            {
                address: mockToken3.address,
                symbol: mockToken3.symbol,
                name: "Test Token 3",
                decimals: mockToken3.decimals,
                balance: "20000000",
                uiAmount: 20,
                chainId: "solana",
                logoURI: mockToken3.logoURI,
                priceUsd: 3.3,
                valueUsd: 66,
            },
        ];
    }

    // Reset mocks before each test
    beforeEach(() => {
        vi.clearAllMocks();

        // Mock the strategy module functions
        vi.mocked(strategyModule.calculateTradeAmount).mockReturnValue(100);
        vi.mocked(strategyModule.evaluateStrategy).mockReturnValue({
            shouldOpen: false,
            shouldClose: false,
            description: "Test strategy evaluation",
            hasOpenPosition: false,
            openProximity: 0,
            closeProximity: 0,
        });
    });

    it("should evaluate trade decisions for all token pairs", async () => {
        // Setup specific mocks for this test
        vi.mocked(strategyModule.evaluateStrategy).mockImplementation(
            ({ pair, index }) => {
                // For the first pair, simulate a buy signal
                if (index === 0) {
                    return {
                        shouldOpen: true,
                        shouldClose: false,
                        description: "Buy signal detected",
                        hasOpenPosition: false,
                        openProximity: 0.8,
                        closeProximity: 0.1,
                    };
                }
                // For the second pair, simulate a position that should be closed
                return {
                    shouldOpen: false,
                    shouldClose: true,
                    description: "Sell signal detected",
                    hasOpenPosition: true,
                    openProximity: 0.2,
                    closeProximity: 0.9,
                };
            }
        );

        const decisions = await evaluateTradeDecisions(mockTradingContext);

        expect(decisions).toHaveLength(2);
        expect(decisions[0]).toEqual({
            shouldOpen: true,
            shouldClose: false,
            tokenPair: tokenPairs.pair1,
            amount: 100,
            strategyAssignmentId: mockTradingContext.agentStrategyAssignment.id,
            description: "Buy signal detected",
            position: undefined,
        });
        expect(decisions[1]).toEqual({
            shouldOpen: false,
            shouldClose: true,
            tokenPair: mockTokenPair2,
            amount: 100,
            strategyAssignmentId: mockTradingContext.agentStrategyAssignment.id,
            description: "Sell signal detected (Position already open)",
            position: undefined,
        });

        expect(strategyModule.calculateTradeAmount).toHaveBeenCalledWith({
            ctx: mockTradingContext,
            pair: tokenPairs.pair1,
        });
        expect(strategyModule.calculateTradeAmount).toHaveBeenCalledWith({
            ctx: mockTradingContext,
            pair: mockTokenPair2,
        });

        expect(strategyModule.evaluateStrategy).toHaveBeenCalledWith({
            ctx: mockTradingContext,
            pair: tokenPairs.pair1,
            index: 0,
            amount: 100,
        });
        expect(strategyModule.evaluateStrategy).toHaveBeenCalledWith({
            ctx: mockTradingContext,
            pair: mockTokenPair2,
            index: 1,
            amount: 100,
        });
    });

    it("should not recommend opening a position for a token pair that already has an open position", async () => {
        // Setup specific mocks for this test
        vi.mocked(strategyModule.evaluateStrategy).mockImplementation(() => ({
            shouldOpen: true,
            shouldClose: false,
            description: "Buy signal detected",
            hasOpenPosition: false,
            openProximity: 0.8,
            closeProximity: 0.1,
        }));

        // Create a position for the first token pair
        const positionForFirstPair = createMockPosition({
            baseTokenAddress: mockTokens.token2.address,
            quoteTokenAddress: mockTokens.token1.address,
        });

        // Update the context with the position
        const contextWithPosition = {
            ...mockTradingContext,
            portfolio: {
                ...mockTradingContext.portfolio,
                openPositions: [positionForFirstPair],
            },
        };

        // Mock the evaluateStrategy to check for existing positions
        vi.mocked(strategyModule.evaluateStrategy).mockImplementation(
            ({ pair, index }) => {
                if (index === 0) {
                    return {
                        shouldOpen: false, // Should not open because position exists
                        shouldClose: false,
                        description: "Position already exists",
                        hasOpenPosition: true,
                        openProximity: 0,
                        closeProximity: 0,
                    };
                }
                return {
                    shouldOpen: true,
                    shouldClose: false,
                    description: "Buy signal detected",
                    hasOpenPosition: false,
                    openProximity: 0.8,
                    closeProximity: 0.1,
                };
            }
        );

        const decisions = await evaluateTradeDecisions(contextWithPosition);

        // Should have two decisions, but only the second one should recommend opening
        expect(decisions).toHaveLength(2);
        expect(decisions[0].shouldOpen).toBe(false);
        expect(decisions[1].shouldOpen).toBe(true);
    });

    it("should not recommend closing a position for a token pair that doesn't match any open position", async () => {
        // Setup specific mocks for this test
        vi.mocked(strategyModule.evaluateStrategy).mockImplementation(() => ({
            shouldOpen: false,
            shouldClose: true,
            description: "Sell signal detected",
            hasOpenPosition: true,
            openProximity: 0.2,
            closeProximity: 0.9,
        }));

        // Create a position for an unrelated token pair
        const unrelatedPosition = createMockPosition({
            baseTokenAddress: "unrelated-token",
            quoteTokenAddress: "another-unrelated-token",
        });

        // Update the context with the unrelated position
        const contextWithUnrelatedPosition = {
            ...mockTradingContext,
            portfolio: {
                ...mockTradingContext.portfolio,
                openPositions: [unrelatedPosition],
            },
        };

        const decisions = await evaluateTradeDecisions(
            contextWithUnrelatedPosition
        );

        // Should have decisions but no positions attached
        expect(decisions).toHaveLength(2);
        expect(decisions[0].position).toBeUndefined();
        expect(decisions[1].position).toBeUndefined();
    });

    it("should handle missing portfolio data", async () => {
        // Create a context with missing portfolio
        const contextWithoutPortfolio = {
            ...mockTradingContext,
            portfolio: undefined,
        };

        // We expect this to throw an error
        await expect(
            evaluateTradeDecisions(contextWithoutPortfolio)
        ).rejects.toThrow("Missing required data");
    });

    it("should handle missing price history data", async () => {
        // Create a context with missing price history
        const contextWithoutPriceHistory = {
            ...mockTradingContext,
            priceHistory: undefined,
        };

        // We expect this to throw an error
        await expect(
            evaluateTradeDecisions(contextWithoutPriceHistory)
        ).rejects.toThrow("Missing required data");
    });
});
