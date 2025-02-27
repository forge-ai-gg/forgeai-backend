import { fetchPriceHistory, priceHistoryUrl } from "../lib/birdeye";
import { getMillisecondsForTimeInterval } from "../lib/timing";
import { DefiHistoryPriceItem } from "../types/birdeye/api/defi";
import { PriceHistoryParams } from "../types/market-data";
import { Token } from "../types/trading-config";
import { TradingStrategyConfig } from "../types/trading-strategy-config";

export type TokenPriceHistory = {
    token: Token;
    prices: DefiHistoryPriceItem[];
};

export type AllTokenPriceHistory = Record<string, TokenPriceHistory>;

export async function getPriceHistory(
    tradingStrategyConfig: TradingStrategyConfig
): Promise<AllTokenPriceHistory> {
    const timeIntervalMs = getMillisecondsForTimeInterval(
        tradingStrategyConfig.timeInterval
    );
    const numberOfBars = 100;
    const timeFrom = Math.floor(
        (Date.now() - timeIntervalMs * numberOfBars) / 1000
    );
    const timeTo = Math.floor(Date.now() / 1000);

    // get all distinct tokens from the trading strategy config
    const allTokens = tradingStrategyConfig.tokenPairs.flatMap((pair) => [
        pair.from,
        pair.to,
    ]);

    // fetch the price history for each token in the pair and return them all in a big array
    const tokenPairPriceHistoryArray = await Promise.all(
        allTokens.map(async (token) => {
            const prices = await fetchTokenPriceHistory({
                tokenAddress: token.address,
                tokenSymbol: token.symbol,
                timeInterval: tradingStrategyConfig.timeInterval,
                timeFrom,
                timeTo,
            });
            return {
                token,
                prices,
            };
        })
    );

    // Convert array to object with token addresses as keys
    const tokenPairPriceHistory = tokenPairPriceHistoryArray.reduce(
        (acc, item) => {
            acc[item.token.address] = item;
            return acc;
        },
        {} as AllTokenPriceHistory
    );

    return tokenPairPriceHistory;
}

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
