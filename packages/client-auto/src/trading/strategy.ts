import { rsi } from "technicalindicators";
import { formatCurrency } from "../lib/formatters";
import { TradingContext } from "../types/trading-context";
import { TradingPair } from "../types/trading-strategy-config";
import { TokenPairPriceHistory } from "./price-history";

export type TradeEvaluationResult = {
    shouldTrade: boolean;
    description: string;
};

export function evaluateStrategy({
    ctx,
    pair,
    index,
}: {
    ctx: TradingContext;
    pair: TradingPair;
    index: number;
}): TradeEvaluationResult {
    const { priceHistory, portfolio, tradingStrategyConfig } = ctx;
    if (!priceHistory || !portfolio)
        return {
            shouldTrade: false,
            description: "Insufficient data",
        };

    const tradingPair = tradingStrategyConfig.tradingPairs[index];
    const pairPriceHistory = priceHistory[index];

    // get the type of the trading strategy that is used to branch logic to determine the strategy to use
    const { type } = tradingStrategyConfig;

    switch (type) {
        case "rsi":
            return evaluateRsiStrategy({
                ctx,
                pair: tradingPair,
                pairPriceHistory,
            });
        default:
            return {
                shouldTrade: false,
                description: "Unsupported strategy type",
            };
    }
}

const evaluateRsiStrategy = ({
    ctx,
    pair,
    pairPriceHistory,
}: {
    ctx: TradingContext;
    pair: TradingPair;
    pairPriceHistory: TokenPairPriceHistory;
}): TradeEvaluationResult => {
    let shouldTrade = false;
    const { portfolio, tradingStrategyConfig } = ctx;
    if (!portfolio)
        return {
            shouldTrade: false,
            description: "Insufficient data",
        };
    const { overBought, overSold, length } = tradingStrategyConfig.rsiConfig;

    const currentFromPrice =
        pairPriceHistory.from[pairPriceHistory.from.length - 1].value;
    const currentToPrice =
        pairPriceHistory.to[pairPriceHistory.to.length - 1].value;

    const rsiValues = rsi({
        period: tradingStrategyConfig.rsiConfig.length,
        values: pairPriceHistory.to.map((p) => p.value),
    });
    const currentRsi = rsiValues[rsiValues.length - 1];

    const hasOpenPosition = portfolio.openPositions?.find(
        (p) => p.baseTokenAddress === pair.from.address
    );

    // if we have an open position, we should sell if the rsi is overbought
    if (hasOpenPosition) {
        shouldTrade = currentRsi > tradingStrategyConfig.rsiConfig.overBought;
    } else {
        shouldTrade = currentRsi < tradingStrategyConfig.rsiConfig.overSold;
    }
    return {
        shouldTrade,
        description: `${pair.from.symbol} (${formatCurrency(
            currentFromPrice
        )}) / ${pair.to.symbol} (${formatCurrency(
            currentToPrice
        )}) - Interval: ${
            tradingStrategyConfig.timeInterval
        } - RSI: ${currentRsi} - Overbought: ${overBought} - Oversold: ${overSold} - Should Trade: ${shouldTrade}`,
    };
};

export function calculateTradeAmount(ctx: TradingContext): number {
    const { portfolio, tradingStrategyConfig } = ctx;
    if (!portfolio) return 0;

    const availableBalance = portfolio.walletPortfolioItems?.find(
        (b) => b.symbol === tradingStrategyConfig.tradingPairs[0].from.symbol
    );

    if (!availableBalance) return 0;

    const maxAmount = Math.min(
        (tradingStrategyConfig.maxPortfolioAllocation /
            availableBalance.valueUsd) *
            Number(availableBalance.uiAmount),
        Number(availableBalance.uiAmount)
    );

    return maxAmount;
}

export function generateTradeReason(ctx: TradingContext): string {
    const { priceHistory, portfolio } = ctx;
    if (!priceHistory || !portfolio) return "Insufficient data";

    const rsi = priceHistory.map((p) => p.from.values);
    const currentRsi = rsi[rsi.length - 1];

    return `RSI at ${currentRsi} with ${
        portfolio.openPositions?.length > 0 ? "open" : "no"
    } position`;
}

export function calculateConfidence(ctx: TradingContext): number {
    const { priceHistory, portfolio, tradingStrategyConfig } = ctx;
    if (!priceHistory || !portfolio) return 0;

    // const rsi = priceHistory.map((p) => p.from.values);
    // const currentRsi = rsi[rsi.length - 1];

    // if (currentRsi > tradingStrategyConfig.rsiConfig.overBought) {
    //     return (
    //         (currentRsi - tradingStrategyConfig.rsiConfig.overBought) /
    //         (100 - tradingStrategyConfig.rsiConfig.overBought)
    //     );
    // } else if (currentRsi < tradingStrategyConfig.rsiConfig.overSold) {
    //     return (
    //         (tradingStrategyConfig.rsiConfig.overSold - currentRsi) /
    //         tradingStrategyConfig.rsiConfig.overSold
    //     );
    // }

    return 0;
}
