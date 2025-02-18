import { TradingContext } from "../types/trading-context";
import { TradeDecision } from "../types/trading-decision";
import {
    calculateConfidence,
    calculateTradeAmount,
    evaluateStrategy,
    generateTradeReason,
} from "./strategy";

export async function evaluateTradeDecisions(
    ctx: TradingContext
): Promise<TradeDecision[]> {
    const { priceHistory, portfolio, tradingStrategyConfig } = ctx;
    if (!priceHistory || !portfolio) throw new Error("Missing required data");

    const tradeDecisions: TradeDecision[] =
        tradingStrategyConfig.tokenPairs.map((pair, index) => {
            const amount = calculateTradeAmount({ ctx, pair });
            const { shouldOpen, shouldClose, description } = evaluateStrategy({
                ctx,
                pair,
                index,
                amount,
            });
            return {
                shouldOpen,
                shouldClose,
                type: shouldOpen ? "OPEN" : "CLOSE",
                tokenPair: {
                    from: shouldOpen ? pair.from : pair.to,
                    to: shouldOpen ? pair.to : pair.from,
                },
                amount,
                reason: generateTradeReason(ctx),
                confidence: calculateConfidence(ctx),
                description,
            };
        });

    return tradeDecisions;
}
