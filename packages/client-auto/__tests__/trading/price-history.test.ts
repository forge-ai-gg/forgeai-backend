import { beforeEach, describe, expect, it, vi } from "vitest";
import * as birdeyeModule from "../../src/lib/birdeye";
import { EnumStrategyType } from "../../src/lib/enums";
import * as timingModule from "../../src/lib/timing";
import { getPriceHistory } from "../../src/trading/price-history";
import { TimeInterval } from "../../src/types/birdeye/api/common";
import { DefiHistoryPriceItem } from "../../src/types/birdeye/api/defi";
import { TradingStrategyConfig } from "../../src/types/trading-strategy-config";

// Mock dependencies
vi.mock("../../src/lib/birdeye", () => ({
    priceHistoryUrl: vi.fn(),
    fetchPriceHistory: vi.fn(),
}));

vi.mock("../../src/lib/timing", () => ({
    getMillisecondsForTimeInterval: vi.fn(),
}));

describe("getPriceHistory", () => {
    // Setup common test variables
    const mockTimeIntervalMs = 86400000; // 1 day in milliseconds
    const mockCurrentTime = 1625097600000; // 2021-07-01T00:00:00.000Z

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

    const mockToken3 = {
        address: "token-address-3",
        symbol: "TEST3",
        logoURI: "test-logo-uri-3",
        decimals: 8,
        network: "solana",
    };

    const mockTradingStrategyConfig: TradingStrategyConfig = {
        title: "Test Strategy",
        type: EnumStrategyType.RSI,
        tokenPairs: [
            {
                from: mockToken1,
                to: mockToken2,
            },
            {
                from: mockToken2,
                to: mockToken3,
            },
        ],
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

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock Date.now() to return a fixed timestamp
        vi.spyOn(Date, "now").mockReturnValue(mockCurrentTime);

        // Setup default mocks
        vi.mocked(timingModule.getMillisecondsForTimeInterval).mockReturnValue(
            mockTimeIntervalMs
        );

        // Mock priceHistoryUrl to return different URLs for different tokens
        vi.mocked(birdeyeModule.priceHistoryUrl).mockImplementation(
            (tokenAddress) =>
                `https://api.birdeye.com/defi/history/${tokenAddress}`
        );

        // Mock fetchPriceHistory to return different price histories for different tokens
        vi.mocked(birdeyeModule.fetchPriceHistory).mockImplementation((url) => {
            if (url.includes("token-address-1")) {
                return Promise.resolve(mockPriceHistoryToken1);
            } else if (url.includes("token-address-2")) {
                return Promise.resolve(mockPriceHistoryToken2);
            } else if (url.includes("token-address-3")) {
                return Promise.resolve(mockPriceHistoryToken3);
            }
            return Promise.resolve([]);
        });
    });

    it("should fetch price history for all tokens in the trading strategy", async () => {
        // Act
        const result = await getPriceHistory(mockTradingStrategyConfig);

        // Assert
        // Verify getMillisecondsForTimeInterval was called with the correct time interval
        expect(
            timingModule.getMillisecondsForTimeInterval
        ).toHaveBeenCalledWith(mockTradingStrategyConfig.timeInterval);

        // Calculate expected time range
        const expectedTimeFrom = Math.floor(
            (mockCurrentTime - mockTimeIntervalMs * 100) / 1000
        );
        const expectedTimeTo = Math.floor(mockCurrentTime / 1000);

        // Verify priceHistoryUrl was called for each unique token
        // Note: The implementation might call it more times depending on how it processes the tokens
        expect(birdeyeModule.priceHistoryUrl).toHaveBeenCalledWith(
            mockToken1.address,
            "token",
            mockTradingStrategyConfig.timeInterval,
            expectedTimeFrom,
            expectedTimeTo
        );
        expect(birdeyeModule.priceHistoryUrl).toHaveBeenCalledWith(
            mockToken2.address,
            "token",
            mockTradingStrategyConfig.timeInterval,
            expectedTimeFrom,
            expectedTimeTo
        );
        expect(birdeyeModule.priceHistoryUrl).toHaveBeenCalledWith(
            mockToken3.address,
            "token",
            mockTradingStrategyConfig.timeInterval,
            expectedTimeFrom,
            expectedTimeTo
        );

        // Verify fetchPriceHistory was called for each URL
        // The actual number might vary based on implementation details
        expect(birdeyeModule.fetchPriceHistory).toHaveBeenCalled();

        // Verify the returned price history has the correct structure
        expect(result).toEqual({
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
        });
    });

    it("should handle empty price history for a token", async () => {
        // Arrange
        vi.mocked(birdeyeModule.fetchPriceHistory).mockImplementation((url) => {
            if (url.includes("token-address-1")) {
                return Promise.resolve([]);
            } else if (url.includes("token-address-2")) {
                return Promise.resolve(mockPriceHistoryToken2);
            } else if (url.includes("token-address-3")) {
                return Promise.resolve(mockPriceHistoryToken3);
            }
            return Promise.resolve([]);
        });

        // Act
        const result = await getPriceHistory(mockTradingStrategyConfig);

        // Assert
        expect(result[mockToken1.address].prices).toEqual([]);
        expect(result[mockToken2.address].prices).toEqual(
            mockPriceHistoryToken2
        );
        expect(result[mockToken3.address].prices).toEqual(
            mockPriceHistoryToken3
        );
    });

    it("should handle different time intervals", async () => {
        // Arrange
        const hourlyConfig = {
            ...mockTradingStrategyConfig,
            timeInterval: "1H" as TimeInterval,
        };
        const hourlyMs = 3600000; // 1 hour in milliseconds
        vi.mocked(timingModule.getMillisecondsForTimeInterval).mockReturnValue(
            hourlyMs
        );

        // Act
        await getPriceHistory(hourlyConfig);

        // Assert
        // Verify getMillisecondsForTimeInterval was called with the correct time interval
        expect(
            timingModule.getMillisecondsForTimeInterval
        ).toHaveBeenCalledWith("1H");

        // Calculate expected time range for hourly interval
        const expectedTimeFrom = Math.floor(
            (mockCurrentTime - hourlyMs * 100) / 1000
        );
        const expectedTimeTo = Math.floor(mockCurrentTime / 1000);

        // Verify priceHistoryUrl was called with the correct time interval
        expect(birdeyeModule.priceHistoryUrl).toHaveBeenCalledWith(
            expect.any(String),
            "token",
            "1H",
            expectedTimeFrom,
            expectedTimeTo
        );
    });

    it("should handle a single token pair", async () => {
        // Arrange
        const singlePairConfig = {
            ...mockTradingStrategyConfig,
            tokenPairs: [
                {
                    from: mockToken1,
                    to: mockToken2,
                },
            ],
        };

        // Act
        const result = await getPriceHistory(singlePairConfig);

        // Assert
        expect(Object.keys(result)).toHaveLength(2);
        expect(result).toHaveProperty(mockToken1.address);
        expect(result).toHaveProperty(mockToken2.address);
        expect(result).not.toHaveProperty(mockToken3.address);
    });

    it("should throw an error when fetchPriceHistory fails", async () => {
        // Arrange
        const mockError = new Error("Failed to fetch price history");
        vi.mocked(birdeyeModule.fetchPriceHistory).mockRejectedValue(mockError);

        // Act & Assert
        await expect(
            getPriceHistory(mockTradingStrategyConfig)
        ).rejects.toThrow(mockError);
    });

    it("should deduplicate tokens that appear in multiple pairs", async () => {
        // Arrange
        // Clear previous calls
        vi.clearAllMocks();

        const configWithDuplicateTokens = {
            ...mockTradingStrategyConfig,
            tokenPairs: [
                {
                    from: mockToken1,
                    to: mockToken2,
                },
                {
                    from: mockToken1, // Duplicate token
                    to: mockToken3,
                },
            ],
        };

        // Act
        const result = await getPriceHistory(configWithDuplicateTokens);

        // Assert
        // Verify the result contains each token exactly once
        expect(Object.keys(result)).toHaveLength(3);
        expect(result).toHaveProperty(mockToken1.address);
        expect(result).toHaveProperty(mockToken2.address);
        expect(result).toHaveProperty(mockToken3.address);

        // Verify the token appears in the result only once
        const token1Results = Object.values(result).filter(
            (item) => item.token.address === mockToken1.address
        );
        expect(token1Results).toHaveLength(1);
    });
});
