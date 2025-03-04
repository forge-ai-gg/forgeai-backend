import { EnumPositionStatus, EnumStrategyType } from "@/lib/enums";
import { TimeInterval } from "@/types/birdeye/api/common";
import { DefiHistoryPriceItem } from "@/types/birdeye/api/defi";
import { WalletPortfolioItem } from "@/types/birdeye/api/wallet";
import { TradingContext } from "@/types/trading-context";
import {
    TokenPair,
    TradingStrategyConfig,
} from "@/types/trading-strategy-config";
import { Position } from "@prisma/client";
import { vi } from "vitest";

/**
 * Common mock tokens for testing
 */
export const mockTokens = {
    token1: {
        address: "token-address-1",
        symbol: "TEST1",
        logoURI: "test-logo-uri-1",
        decimals: 9,
        network: "solana",
    },
    token2: {
        address: "token-address-2",
        symbol: "TEST2",
        logoURI: "test-logo-uri-2",
        decimals: 6,
        network: "solana",
    },
    usdc: {
        address: "usdc-token-address",
        symbol: "USDC",
        logoURI: "usdc-logo-uri",
        decimals: 6,
        network: "solana",
    },
};

/**
 * Create token pairs for testing
 */
export const createTokenPairs = (): Record<string, TokenPair> => {
    return {
        pair1: {
            from: mockTokens.token1,
            to: mockTokens.token2,
        },
        usdcPair: {
            from: mockTokens.token1,
            to: mockTokens.usdc,
        },
    };
};

/**
 * Create mock price history for testing
 * @param tokens Array of tokens to create price history for
 * @param numDataPoints Number of price data points to generate
 * @param basePrice Starting price for the first token
 * @param priceIncrement Amount to increment price by for each data point
 */
export const createMockPriceHistory = (
    tokens = [mockTokens.token1, mockTokens.token2],
    numDataPoints = 10,
    basePrice = 100,
    priceIncrement = 1
): Record<string, { token: any; prices: DefiHistoryPriceItem[] }> => {
    const priceHistory: Record<
        string,
        { token: any; prices: DefiHistoryPriceItem[] }
    > = {};

    tokens.forEach((token, index) => {
        priceHistory[token.address] = {
            token,
            prices: Array(numDataPoints)
                .fill(0)
                .map((_, i) => ({
                    unixTime:
                        Date.now() / 1000 - (numDataPoints - 1 - i) * 3600,
                    value: basePrice / (index + 1) + i * priceIncrement,
                    address: token.address,
                })),
        };
    });

    return priceHistory;
};

/**
 * Create a mock trading strategy config
 * @param type Strategy type
 * @param tokenPairs Token pairs to use
 */
export const createMockStrategyConfig = (
    type = EnumStrategyType.RSI,
    tokenPairs = [createTokenPairs().pair1]
): TradingStrategyConfig => {
    const baseConfig = {
        title: `Test ${type} Strategy`,
        type,
        tokenPairs,
        timeInterval: "1h" as TimeInterval,
        maxPortfolioAllocation: 20, // 20% of portfolio
    };

    // Add strategy-specific config
    switch (type) {
        case EnumStrategyType.RSI:
            return {
                ...baseConfig,
                rsiConfig: {
                    length: 14,
                    overBought: 70,
                    overSold: 30,
                },
            };
        // Add other strategy types as needed
        default:
            return baseConfig;
    }
};

/**
 * Create a mock position
 */
export const createMockPosition = (
    overrides: Partial<Position> = {}
): Position => {
    return {
        id: "test-position-id",
        strategyAssignmentId: "test-assignment-id",
        status: EnumPositionStatus.OPEN,
        baseTokenAddress: mockTokens.token2.address,
        baseTokenSymbol: mockTokens.token2.symbol,
        baseTokenDecimals: mockTokens.token2.decimals,
        baseTokenLogoURI: mockTokens.token2.logoURI,
        quoteTokenAddress: mockTokens.token1.address,
        quoteTokenSymbol: mockTokens.token1.symbol,
        quoteTokenDecimals: mockTokens.token1.decimals,
        quoteTokenLogoURI: mockTokens.token1.logoURI,
        entryPrice: 10,
        exitPrice: null,
        totalBaseAmount: "100",
        averageEntryPrice: 10,
        realizedPnlUsd: null,
        totalFeesUsd: 0,
        side: "buy",
        metadata: {},
        openedAt: new Date(),
        closedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    } as Position;
};

/**
 * Create a basic trading context for testing
 */
export const createBaseTradingContext = (
    priceHistory = createMockPriceHistory(),
    positions: Position[] = []
): TradingContext => {
    return {
        cycle: 1,
        publicKey: "test-public-key",
        privateKey: "test-private-key",
        priceHistory,
        portfolio: {
            walletPortfolioItems: [
                {
                    address: mockTokens.token1.address,
                    symbol: mockTokens.token1.symbol,
                    logoURI: mockTokens.token1.logoURI,
                    decimals: mockTokens.token1.decimals,
                    priceUsd: 100,
                    valueUsd: 10000,
                    balance: "100",
                    uiAmount: 100,
                    chainId: "solana",
                },
                {
                    address: mockTokens.token2.address,
                    symbol: mockTokens.token2.symbol,
                    logoURI: mockTokens.token2.logoURI,
                    decimals: mockTokens.token2.decimals,
                    priceUsd: 10,
                    valueUsd: 1000,
                    balance: "100",
                    uiAmount: 100,
                    chainId: "solana",
                },
            ] as WalletPortfolioItem[],
            openPositions: positions,
            totalValue: 11000,
        },
        agentTradingStrategy: {
            id: "test-strategy-id",
            title: "Test RSI Strategy",
            description: "A test RSI strategy for unit tests",
            config: JSON.stringify(createMockStrategyConfig()),
            createdAt: new Date(),
            updatedAt: new Date(),
        } as any,
        agentStrategyAssignment: {
            id: "test-assignment-id",
            agentId: "test-agent-id",
            agentTradingStrategyId: "test-strategy-id",
            status: "ACTIVE",
            createdAt: new Date(),
            updatedAt: new Date(),
        } as any,
        tradingStrategyConfig: createMockStrategyConfig(),
        isPaperTrading: true,
    };
};

/**
 * Mock the technicalindicators library for RSI testing
 * @param defaultRsiValue Default RSI value to return
 */
export const mockTechnicalIndicators = (defaultRsiValue = 30) => {
    vi.mock("technicalindicators", () => {
        return {
            rsi: vi.fn().mockReturnValue([defaultRsiValue]),
        };
    });

    // Return the mocked function for use in tests
    return {
        rsi: vi
            .fn()
            .mockReturnValue([defaultRsiValue]) as unknown as ReturnType<
            typeof vi.fn
        >,
    };
};
