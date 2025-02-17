import { TimeInterval } from "./birdeye/api/common";

export interface MarketData {
    technicals: {
        rsi: number[];
        sma: number[];
        currentPrice: number;
        priceChange24h: number;
    };
    metrics: {
        volume24h: number;
        liquidity: number;
        volatility: number;
    };
}

export interface PriceHistoryParams {
    tokenAddress: string;
    tokenSymbol: string;
    timeInterval: TimeInterval;
    timeFrom: number;
    timeTo: number;
}

export interface PriceHistoryResponse {
    data: {
        items: Array<{
            unixTime?: number;
            value?: number;
            volume?: number;
            address?: string;
        }>;
    };
}
