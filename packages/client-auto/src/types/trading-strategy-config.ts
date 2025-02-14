import { TimeInterval } from "./birdeye/api/common";
import { WalletPortfolioItem } from "./birdeye/api/wallet";

type Token = Pick<
    WalletPortfolioItem,
    "address" | "symbol" | "logoURI" | "priceUsd" | "decimals"
>;

type TechnicalStrategyType = "rsi" | "macd" | "bollinger-bands" | "ema" | "sma";

type RSIConfig = {
    length: number;
    overBought: number;
    overSold: number;
};

// this is used to store the data in the db
export type TradingStrategyConfig = {
    title: TechnicalStrategyType; // a title for the strategy - rsi
    tokens: Token[]; // a list of tokens to trade
    timeInterval: TimeInterval; // the time interval to trade
    maxPortfolioAllocation: number; // the maximum portfolio allocation for the strategy as a percentage from 0 to 100
    rsiConfig?: RSIConfig; // the configuration for the rsi strategy
};
