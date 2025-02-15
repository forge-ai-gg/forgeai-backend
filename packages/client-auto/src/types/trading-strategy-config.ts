import { TimeInterval } from "./birdeye/api/common";
import { WalletPortfolioItem } from "./birdeye/api/wallet";

type Token = Pick<
    WalletPortfolioItem,
    "address" | "symbol" | "logoURI" | "decimals"
> & {
    network: string;
};

type TechnicalStrategyType = "rsi" | "macd" | "bollinger-bands" | "ema" | "sma";

type RSIConfig = {
    length: number;
    overBought: number;
    overSold: number;
};

type TradingPair = {
    from: Token;
    to: Token;
};

// this is used to store the data in the db
export type TradingStrategyConfig = {
    title: TechnicalStrategyType; // a title for the strategy - rsi
    tradingPairs: TradingPair[]; // a list of trading pairs to trade
    timeInterval: TimeInterval; // the time interval to trade
    maxPortfolioAllocation: number; // the maximum portfolio allocation for the strategy as a percentage from 0 to 100
    rsiConfig?: RSIConfig; // the configuration for the rsi strategy
};
