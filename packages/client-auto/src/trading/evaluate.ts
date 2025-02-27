import { TradingContext } from "../types/trading-context";
import { TradeDecision } from "../types/trading-decision";
import { TokenPair } from "../types/trading-strategy-config";
import { calculateTradeAmount, evaluateStrategy } from "./strategy";

export async function evaluateTradeDecisions(
    ctx: TradingContext
): Promise<TradeDecision[]> {
    const { priceHistory, portfolio, tradingStrategyConfig } = ctx;
    if (!priceHistory || !portfolio) throw new Error("Missing required data");

    const tradeDecisions: TradeDecision[] =
        tradingStrategyConfig.tokenPairs.map((pair, index) =>
            evaluateTradeDecision(ctx, pair, index)
        );

    return tradeDecisions;
}

function evaluateTradeDecision(
    ctx: TradingContext,
    pair: TokenPair,
    index: number
): TradeDecision {
    const amount = calculateTradeAmount({ ctx, pair });

    const { shouldOpen, shouldClose, description, hasOpenPosition } =
        evaluateStrategy({
            ctx,
            pair,
            index,
            amount,
        });

    return {
        shouldOpen,
        shouldClose,
        tokenPair: pair,
        amount,
        strategyAssignmentId: ctx.agentStrategyAssignment.id,
        description: hasOpenPosition
            ? `${description} (Position already open)`
            : description,
    };
}
