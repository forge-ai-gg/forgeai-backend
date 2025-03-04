import { FORCE_CLOSE_POSITION, FORCE_OPEN_POSITION } from "@/lib/constants";
import { formatCurrency } from "@/lib/formatters";
import { TradingContext } from "@/types/trading-context";
import { TokenPair } from "@/types/trading-strategy-config";
import { rsi } from "technicalindicators";
import { TradeEvaluationResult } from "../strategy";

export const evaluateRsiStrategy = ({
    ctx,
    pair,
    amount,
}: {
    ctx: TradingContext;
    pair: TokenPair;
    amount: number;
}): TradeEvaluationResult => {
    const { portfolio, tradingStrategyConfig } = ctx;
    const { overBought, overSold } = tradingStrategyConfig.rsiConfig;

    const currentFromPrice =
        ctx.priceHistory[pair.from.address].prices[
            ctx.priceHistory[pair.from.address].prices.length - 1
        ].value;
    const currentToPrice =
        ctx.priceHistory[pair.to.address].prices[
            ctx.priceHistory[pair.to.address].prices.length - 1
        ].value;

    const rsiValues = rsi({
        period: tradingStrategyConfig.rsiConfig.length,
        values: ctx.priceHistory[pair.to.address].prices.map((p) => p.value),
    });
    const currentRsi = rsiValues[rsiValues.length - 1];

    // check if this agent has an open position for this pair
    const openPosition = portfolio.openPositions?.find(
        (p) =>
            p.baseTokenAddress === pair.to.address &&
            p.quoteTokenAddress === pair.from.address
    );
    const hasOpenPosition = Boolean(openPosition);

    // Calculate proximities to opening or closing a position
    const openProximity = hasOpenPosition
        ? 0
        : Math.max(0, Math.min(1, (overSold - currentRsi) / overSold));
    const closeProximity = !hasOpenPosition
        ? 0
        : Math.max(
              0,
              Math.min(1, (currentRsi - overBought) / (100 - overBought))
          );

    const shouldClose =
        (hasOpenPosition && currentRsi > overBought) || FORCE_CLOSE_POSITION;
    const shouldOpen =
        (!hasOpenPosition && currentRsi < overSold) || FORCE_OPEN_POSITION;

    return {
        shouldOpen,
        shouldClose,
        openProximity,
        closeProximity,
        hasOpenPosition,
        description: `${pair.from.symbol} (${formatCurrency(
            currentFromPrice
        )}) / ${pair.to.symbol} (${formatCurrency(
            currentToPrice
        )}) - Interval: ${
            tradingStrategyConfig.timeInterval
        } - RSI: ${currentRsi} - Overbought: ${overBought} - Oversold: ${overSold} - Should Open: ${shouldOpen} - Should Close: ${shouldClose} - Open Proximity: ${openProximity.toFixed(
            2
        )} - Close Proximity: ${closeProximity.toFixed(
            2
        )} - Amount: ${amount} - hasOpenPosition: ${hasOpenPosition}`,
    };
};

export function generateRsiTradeReason(
    ctx: TradingContext,
    pair: TokenPair
): string {
    const { priceHistory, portfolio } = ctx;
    if (!priceHistory || !portfolio) return "Insufficient data";

    const rsiValues = rsi({
        period: ctx.tradingStrategyConfig.rsiConfig.length,
        values: ctx.priceHistory[pair.to.address].prices.map((p) => p.value),
    });
    const currentRsi = rsiValues[rsiValues.length - 1];

    return `RSI at ${currentRsi} with ${
        portfolio.openPositions?.length > 0 ? "open" : "no"
    } position`;
}
