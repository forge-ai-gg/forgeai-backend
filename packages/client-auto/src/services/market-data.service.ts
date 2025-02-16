import { rsi, sma } from "technicalindicators";
import { fetchPriceHistory, priceHistoryUrl } from "../lib/birdeye";
import { getMillisecondsForTimeInterval } from "../lib/timing";
import { TimeInterval } from "../types/birdeye/api/common";

export class MarketDataService {
    async getMarketData(
        tokenFromAddress: string,
        tokenToAddress: string,
        timeInterval: TimeInterval,
        rsiLength: number
    ) {
        const timeIntervalMs = getMillisecondsForTimeInterval(timeInterval);
        const numberOfBars = 100;
        const timeFrom = Math.floor(
            (new Date().getTime() - timeIntervalMs * numberOfBars) / 1000
        );
        const timeTo = Math.floor(new Date().getTime() / 1000);

        const [priceHistoryFromToken, priceHistoryToToken] = await Promise.all([
            this.fetchTokenPriceHistory(
                tokenFromAddress,
                timeInterval,
                timeFrom,
                timeTo
            ),
            this.fetchTokenPriceHistory(
                tokenToAddress,
                timeInterval,
                timeFrom,
                timeTo
            ),
        ]);

        const prices = priceHistoryFromToken.data.items.map(
            (item) => item.value
        );

        return {
            sma: this.calculateSMA(prices, rsiLength),
            rsi: this.calculateRSI(prices, rsiLength),
            priceHistoryFromToken,
            priceHistoryToToken,
        };
    }

    private async fetchTokenPriceHistory(
        tokenAddress: string,
        timeInterval: TimeInterval,
        timeFrom: number,
        timeTo: number
    ) {
        const url = priceHistoryUrl(
            tokenAddress,
            "token",
            timeInterval,
            timeFrom,
            timeTo
        );
        return await fetchPriceHistory(url);
    }

    private calculateSMA(prices: number[], period: number) {
        return sma({ period, values: prices });
    }

    private calculateRSI(prices: number[], period: number) {
        return rsi({ period, values: prices });
    }
}
