import { Position } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EnumPositionStatus, EnumStrategyType } from "../../../src/lib/enums";
import { evaluateTradeDecisions } from "../../../src/trading/evaluate";
import { PortfolioState } from "../../../src/trading/portfolio";
import { AllTokenPriceHistory } from "../../../src/trading/price-history";
import * as strategyModule from "../../../src/trading/strategy";
import { TimeInterval } from "../../../src/types/birdeye/api/common";
import { DefiHistoryPriceItem } from "../../../src/types/birdeye/api/defi";
import { WalletPortfolioItem } from "../../../src/types/birdeye/api/wallet";
import { TradingContext } from "../../../src/types/trading-context";
import {
    TokenPair,
    TradingStrategyConfig,
} from "../../../src/types/trading-strategy-config";

// Define a type for tokens in our tests
type TestToken = {
    address: string;
    symbol: string;
    logoURI: string;
    decimals: number;
    network: string;
};

// Mock dependencies
vi.mock("../../../src/trading/strategy", () => ({
    calculateTradeAmount: vi.fn(),
    evaluateStrategy: vi.fn(),
}));

describe("evaluateTradeDecisions", () => {
    // Setup common test variables
    const mockToken1: TestToken = {
        address: "token-address-1",
        symbol: "TEST1",
        logoURI: "test-logo-uri-1",
        decimals: 9,
        network: "solana",
    };

    const mockToken2: TestToken = {
        address: "token-address-2",
        symbol: "TEST2",
        logoURI: "test-logo-uri-2",
        decimals: 6,
        network: "solana",
    };

    const mockToken3: TestToken = {
        address: "token-address-3",
        symbol: "TEST3",
        logoURI: "test-logo-uri-3",
        decimals: 8,
        network: "solana",
    };

    const mockTokenPair1: TokenPair = {
        from: mockToken1,
        to: mockToken2,
    };

    const mockTokenPair2: TokenPair = {
        from: mockToken2,
        to: mockToken3,
    };

    const mockTradingStrategyConfig: TradingStrategyConfig = {
        title: "Test Strategy",
        type: EnumStrategyType.RSI,
        tokenPairs: [mockTokenPair1, mockTokenPair2],
        timeInterval: "1D" as TimeInterval,
        maxPortfolioAllocation: 50,
        rsiConfig: {
            length: 14,
            overBought: 70,
            overSold: 30,
        },
    };

    const mockPriceHistoryToken1: DefiHistoryPriceItem[] = [
        { unixTime: 1625011200, value: 1.0 },
        { unixTime: 1625097600, value: 1.2 },
    ];

    const mockPriceHistoryToken2: DefiHistoryPriceItem[] = [
        { unixTime: 1625011200, value: 2.0 },
        { unixTime: 1625097600, value: 2.2 },
    ];

    const mockPriceHistoryToken3: DefiHistoryPriceItem[] = [
        { unixTime: 1625011200, value: 3.0 },
        { unixTime: 1625097600, value: 3.3 },
    ];

    const mockPriceHistory: AllTokenPriceHistory = {
        [mockToken1.address]: {
            token: mockToken1,
            prices: mockPriceHistoryToken1,
        },
        [mockToken2.address]: {
            token: mockToken2,
            prices: mockPriceHistoryToken2,
        },
        [mockToken3.address]: {
            token: mockToken3,
            prices: mockPriceHistoryToken3,
        },
    };

    const mockWalletPortfolioItems: WalletPortfolioItem[] = [
        {
            address: mockToken1.address,
            symbol: mockToken1.symbol,
            name: "Test Token 1",
            decimals: mockToken1.decimals,
            balance: "100000000000",
            uiAmount: 100,
            chainId: "solana",
            logoURI: mockToken1.logoURI,
            priceUsd: 1.2,
            valueUsd: 120,
        },
        {
            address: mockToken2.address,
            symbol: mockToken2.symbol,
            name: "Test Token 2",
            decimals: mockToken2.decimals,
            balance: "50000000",
            uiAmount: 50,
            chainId: "solana",
            logoURI: mockToken2.logoURI,
            priceUsd: 2.2,
            valueUsd: 110,
        },
    ];

    const mockPosition: Position = {
        id: "position-1",
        strategyAssignmentId: "test-assignment-id",
        status: EnumPositionStatus.OPEN,
        baseTokenAddress: mockToken3.address,
        baseTokenSymbol: mockToken3.symbol,
        baseTokenDecimals: mockToken3.decimals,
        baseTokenLogoURI: mockToken3.logoURI,
        quoteTokenAddress: mockToken2.address,
        quoteTokenSymbol: mockToken2.symbol,
        quoteTokenDecimals: mockToken2.decimals,
        quoteTokenLogoURI: mockToken2.logoURI,
        entryPrice: 1.8,
        exitPrice: null,
        totalBaseAmount: "50",
        averageEntryPrice: 1.8,
        realizedPnlUsd: null,
        totalFeesUsd: 0,
        side: "buy",
        metadata: {},
        openedAt: new Date(),
        closedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: null,
    };

    const mockPortfolio: PortfolioState = {
        openPositions: [mockPosition],
        walletPortfolioItems: mockWalletPortfolioItems,
        totalValue: 230,
    };

    const mockTradingContext: TradingContext = {
        cycle: 1,
        publicKey: "test-public-key",
        privateKey: "test-private-key",
        agentTradingStrategy: {
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
            defaultConfig: {},
        },
        agentStrategyAssignment: {
            id: "test-assignment-id",
            agentId: "test-agent-id",
            strategyId: "test-strategy-id",
            isActive: true,
            isPaperTrading: false,
            config: mockTradingStrategyConfig,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdById: "test-user-id",
            updatedById: "test-user-id",
            startDate: new Date(),
            endDate: new Date(),
        },
        tradingStrategyConfig: mockTradingStrategyConfig,
        priceHistory: mockPriceHistory,
        portfolio: mockPortfolio,
        isPaperTrading: false,
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default mocks
        vi.mocked(strategyModule.calculateTradeAmount).mockImplementation(
            () => 100
        );
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
    });

    it("should evaluate trade decisions for all token pairs", async () => {
        // Act
        const result = await evaluateTradeDecisions(mockTradingContext);

        // Assert
        // Verify calculateTradeAmount was called for each token pair
        expect(strategyModule.calculateTradeAmount).toHaveBeenCalledTimes(2);
        expect(strategyModule.calculateTradeAmount).toHaveBeenCalledWith({
            ctx: mockTradingContext,
            pair: mockTokenPair1,
        });
        expect(strategyModule.calculateTradeAmount).toHaveBeenCalledWith({
            ctx: mockTradingContext,
            pair: mockTokenPair2,
        });

        // Verify evaluateStrategy was called for each token pair
        expect(strategyModule.evaluateStrategy).toHaveBeenCalledTimes(2);
        expect(strategyModule.evaluateStrategy).toHaveBeenCalledWith({
            ctx: mockTradingContext,
            pair: mockTokenPair1,
            index: 0,
            amount: 100,
        });
        expect(strategyModule.evaluateStrategy).toHaveBeenCalledWith({
            ctx: mockTradingContext,
            pair: mockTokenPair2,
            index: 1,
            amount: 100,
        });

        // Verify the returned trade decisions
        expect(result).toHaveLength(2);

        // First decision should be to open a position
        expect(result[0]).toEqual({
            shouldOpen: true,
            shouldClose: false,
            tokenPair: mockTokenPair1,
            amount: 100,
            strategyAssignmentId: mockTradingContext.agentStrategyAssignment.id,
            description: "Buy signal detected",
            position: undefined,
        });

        // Second decision should be to close a position
        expect(result[1]).toEqual({
            shouldOpen: false,
            shouldClose: true,
            tokenPair: mockTokenPair2,
            amount: 100,
            strategyAssignmentId: mockTradingContext.agentStrategyAssignment.id,
            description: "Sell signal detected (Position already open)",
            position: mockPosition,
        });
    });

    it("should throw an error when priceHistory is missing", async () => {
        // Arrange
        const contextWithoutPriceHistory = {
            ...mockTradingContext,
            priceHistory: undefined,
        };

        // Act & Assert
        await expect(
            evaluateTradeDecisions(contextWithoutPriceHistory)
        ).rejects.toThrow("Missing required data");
    });

    it("should throw an error when portfolio is missing", async () => {
        // Arrange
        const contextWithoutPortfolio = {
            ...mockTradingContext,
            portfolio: undefined,
        };

        // Act & Assert
        await expect(
            evaluateTradeDecisions(contextWithoutPortfolio)
        ).rejects.toThrow("Missing required data");
    });

    it("should handle empty token pairs", async () => {
        // Arrange
        const contextWithEmptyTokenPairs = {
            ...mockTradingContext,
            tradingStrategyConfig: {
                ...mockTradingStrategyConfig,
                tokenPairs: [],
            },
        };

        // Act
        const result = await evaluateTradeDecisions(contextWithEmptyTokenPairs);

        // Assert
        expect(result).toEqual([]);
        expect(strategyModule.calculateTradeAmount).not.toHaveBeenCalled();
        expect(strategyModule.evaluateStrategy).not.toHaveBeenCalled();
    });

    it("should handle a position that matches the token pair", async () => {
        // Arrange
        // Mock evaluateStrategy to return hasOpenPosition: true for the first pair
        vi.mocked(strategyModule.evaluateStrategy).mockImplementation(
            ({ pair, index }) => {
                if (index === 0) {
                    return {
                        shouldOpen: false,
                        shouldClose: true,
                        description: "Sell signal detected",
                        hasOpenPosition: true,
                        openProximity: 0.1,
                        closeProximity: 0.9,
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

        // Create a position that matches the first token pair
        const positionForFirstPair: Position = {
            ...mockPosition,
            baseTokenAddress: mockToken2.address,
            quoteTokenAddress: mockToken1.address,
        };

        const contextWithMatchingPosition = {
            ...mockTradingContext,
            portfolio: {
                ...mockPortfolio,
                openPositions: [positionForFirstPair],
            },
        };

        // Act
        const result = await evaluateTradeDecisions(
            contextWithMatchingPosition
        );

        // Assert
        expect(result[0].position).toEqual(positionForFirstPair);
    });

    it("should handle a position that doesn't match any token pair", async () => {
        // Arrange
        // Create a position with different token addresses
        const unrelatedPosition: Position = {
            ...mockPosition,
            baseTokenAddress: "unrelated-token-1",
            quoteTokenAddress: "unrelated-token-2",
        };

        const contextWithUnrelatedPosition = {
            ...mockTradingContext,
            portfolio: {
                ...mockPortfolio,
                openPositions: [unrelatedPosition],
            },
        };

        // Act
        const result = await evaluateTradeDecisions(
            contextWithUnrelatedPosition
        );

        // Assert
        // No position should be included in the trade decisions
        expect(result[0].position).toBeUndefined();
        expect(result[1].position).toBeUndefined();
    });
});
