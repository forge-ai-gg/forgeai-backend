import { Position } from "@prisma/client";
import { TradingContext } from "../types/trading-context";
import { TradeDecision } from "../types/trading-decision";
import { TokenPair } from "../types/trading-strategy-config";
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

    const openPositions = portfolio.openPositions;

    const tradeDecisions: TradeDecision[] =
        tradingStrategyConfig.tokenPairs.map((pair, index) =>
            evaluateTradeDecision(ctx, pair, index, openPositions)
        );

    return tradeDecisions;
}

function evaluateTradeDecision(
    ctx: TradingContext,
    pair: TokenPair,
    index: number,
    openPositions: Position[]
): TradeDecision {
    // Check if there's an open position for this pair
    const existingOpenPosition = openPositions.find(
        (pos) =>
            (pos.baseTokenSymbol === pair.from.symbol &&
                pos.quoteTokenSymbol === pair.to.symbol) ||
            (pos.baseTokenSymbol === pair.to.symbol &&
                pos.quoteTokenSymbol === pair.from.symbol)
    );

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
        tokenPair: pair,
        amount,
        reason: generateTradeReason(ctx),
        confidence: calculateConfidence(ctx),
        description: existingOpenPosition
            ? `${description} (Position already open)`
            : description,
    };
}
