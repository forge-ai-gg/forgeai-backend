import { TradingContext } from "../types/trading-context";
import { TradeDecision } from "../types/trading-decision";
import { executeSolanaTransaction } from "./solana";
import {
    calculateConfidence,
    calculateTradeAmount,
    evaluateStrategy,
    generateTradeReason,
} from "./strategy";

export async function executeTrade(
    ctx: TradingContext,
    decision: TradeDecision
): Promise<string> {
    return await executeSolanaTransaction({
        connection: ctx.connection,
        fromToken: decision.token.from,
        toToken: decision.token.to,
        amount: decision.amount,
        wallet: ctx.publicKey,
    });
}

export async function evaluateTradeDecisions(
    ctx: TradingContext
): Promise<TradeDecision[]> {
    const { priceHistory, portfolio, tradingStrategyConfig } = ctx;
    if (!priceHistory || !portfolio) throw new Error("Missing required data");

    const tradeDecisions: TradeDecision[] =
        tradingStrategyConfig.tradingPairs.map((pair, index) => {
            const { shouldTrade, description } = evaluateStrategy({
                ctx,
                pair,
                index,
            });
            return {
                shouldTrade,
                type: shouldTrade ? "OPEN" : "CLOSE",
                token: {
                    from: pair.from.address,
                    to: pair.to.address,
                },
                amount: calculateTradeAmount(ctx),
                reason: generateTradeReason(ctx),
                confidence: calculateConfidence(ctx),
                description,
            };
        });

    return tradeDecisions;
}
