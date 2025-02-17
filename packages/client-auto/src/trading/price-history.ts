import { fetchPriceHistory, priceHistoryUrl } from "../lib/birdeye";
import { getMillisecondsForTimeInterval } from "../lib/timing";
import { DefiHistoryPriceItem } from "../types/birdeye/api/defi";
import { PriceHistoryParams } from "../types/market-data";
import { TradingStrategyConfig } from "../types/trading-strategy-config";

export type TokenPairPriceHistory = {
    from: DefiHistoryPriceItem[];
    to: DefiHistoryPriceItem[];
};

export async function getPriceHistory(
    tradingStrategyConfig: TradingStrategyConfig
): Promise<TokenPairPriceHistory[]> {
    const timeIntervalMs = getMillisecondsForTimeInterval(
        tradingStrategyConfig.timeInterval
    );
    const numberOfBars = 100;
    const timeFrom = Math.floor(
        (Date.now() - timeIntervalMs * numberOfBars) / 1000
    );
    const timeTo = Math.floor(Date.now() / 1000);

    // fetch the price history for each token in the pair and return them all in a big array
    const tokenPairPriceHistory = await Promise.all(
        tradingStrategyConfig.tradingPairs.map(async (pair) => {
            const [fromPrices, toPrices] = await Promise.all([
                fetchTokenPriceHistory({
                    tokenAddress: pair.from.address,
                    tokenSymbol: pair.from.symbol,
                    timeInterval: tradingStrategyConfig.timeInterval,
                    timeFrom,
                    timeTo,
                }),
                fetchTokenPriceHistory({
                    tokenAddress: pair.to.address,
                    tokenSymbol: pair.to.symbol,
                    timeInterval: tradingStrategyConfig.timeInterval,
                    timeFrom,
                    timeTo,
                }),
            ]);

            return {
                from: fromPrices,
                to: toPrices,
            };
        })
    );

    return tokenPairPriceHistory;
}

// function analyzeTechnicals(prices: number[]): MarketData["technicals"] {
//     return {
//         rsi: calculateRSI(prices, 14),
//         sma: calculateSMA(prices, 20),
//         currentPrice: prices[prices.length - 1],
//         priceChange24h:
//             ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100,
//     };
// }

// function calculateMetrics(
//     prices: number[],
//     volumes: number[]
// ): MarketData["metrics"] {
//     return {
//         volume24h: volumes.reduce((sum, vol) => sum + vol, 0),
//         liquidity: volumes[volumes.length - 1] * prices[prices.length - 1],
//         volatility: calculateVolatility(prices),
//     };
// }

async function fetchTokenPriceHistory(params: PriceHistoryParams) {
    const url = priceHistoryUrl(
        params.tokenAddress,
        "token",
        params.timeInterval,
        params.timeFrom,
        params.timeTo
    );
    return await fetchPriceHistory(url);
}

// function calculateRSI(prices: number[], period: number): number[] {
//     return rsi({ period, values: prices });
// }

// function calculateSMA(prices: number[], period: number): number[] {
//     return sma({ period, values: prices });
// }

// function calculateVolatility(prices: number[]): number {
//     const returns = prices
//         .slice(1)
//         .map((price, i) => Math.log(price / prices[i]));
//     const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
//     const variance =
//         returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) /
//         returns.length;
//     return Math.sqrt(variance) * Math.sqrt(365) * 100;
// }
