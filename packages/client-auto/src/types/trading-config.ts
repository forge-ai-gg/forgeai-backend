import { TimeInterval } from "./birdeye/api/common";

export interface Token {
    address: string;
    symbol: string;
    decimals: number;
    logoURI?: string;
}

export interface TradingPair {
    from: Token;
    to: Token;
}

export interface RsiConfig {
    length: number;
    overBought: number;
    overSold: number;
}

export interface TradingConfig {
    tradingPairs: TradingPair[];
    timeInterval: TimeInterval;
    rsiConfig: RsiConfig;
    maxPositionSizeUsd: number;
    minLiquidityUsd: number;
}
