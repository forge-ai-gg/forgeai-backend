import { TimeInterval } from "./birdeye/api/common";

export type Token = {
    address: string;
    symbol: string;
    decimals: number;
    logoURI?: string;
};

export type TokenWithPrice = Token & {
    price: {
        value: number;
        timestamp?: number;
    };
};

export type TradingPair = {
    from: Token;
    to: Token;
};

export type RsiConfig = {
    length: number;
    overBought: number;
    overSold: number;
};

export type TradingConfig = {
    tradingPairs: TradingPair[];
    timeInterval: TimeInterval;
    rsiConfig: RsiConfig;
    maxPositionSizeUsd: number;
    minLiquidityUsd: number;
};
