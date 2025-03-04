import { TradingContext } from "@/types/trading-context";
import { TradeDecision } from "@/types/trading-decision";
import { TokenPairWithPrice } from "@/types/trading-strategy-config";
import { calculateTradeAmount, evaluateStrategy } from "./strategy";

/**
 * Evaluates trading decisions for all token pairs in the trading strategy
 * @param ctx The trading context
 * @returns Array of trade decisions
 */
export async function evaluateTradeDecisions(
    ctx: TradingContext
): Promise<TradeDecision[]> {
    const { priceHistory, portfolio, tradingStrategyConfig } = ctx;
    if (!priceHistory || !portfolio) throw new Error("Missing required data");

    const tokenPairsWithPrice: TokenPairWithPrice[] =
        tradingStrategyConfig.tokenPairs.map((pair) => {
            const tokenFromLatestPrice =
                priceHistory[pair.from.address].prices[0].value;
            const tokenToLatestPrice =
                priceHistory[pair.to.address].prices[0].value;

            return {
                ...pair,
                from: {
                    ...pair.from,
                    price: { value: tokenFromLatestPrice },
                },
                to: {
                    ...pair.to,
                    price: { value: tokenToLatestPrice },
                },
            };
        });

    const tradeDecisions: TradeDecision[] = tokenPairsWithPrice.map(
        (pair, index) => evaluateTradeDecision({ ctx, pair, index })
    );

    return tradeDecisions;
}

/**
 * Evaluates a single trade decision for a token pair
 * @param ctx The trading context
 * @param pair The token pair to evaluate
 * @param index The index of the token pair in the trading strategy
 * @returns A trade decision
 */
function evaluateTradeDecision({
    ctx,
    pair,
    index,
}: {
    ctx: TradingContext;
    pair: TokenPairWithPrice;
    index: number;
}): TradeDecision {
    // Calculate the amount to trade based on portfolio allocation rules
    const amount = calculateTradeAmount({ ctx, pair });

    // Evaluate the strategy to determine if we should open or close a position
    const { shouldOpen, shouldClose, description, hasOpenPosition } =
        evaluateStrategy({
            ctx,
            pair,
            index,
            amount,
        });

    // Return the trade decision
    return {
        shouldOpen,
        shouldClose,
        tokenPair: pair,
        amount,
        strategyAssignmentId: ctx.agentStrategyAssignment.id,
        description: hasOpenPosition
            ? `${description} (Position already open)`
            : description,
        // If we're closing a position, include the position in the decision
        position: hasOpenPosition
            ? ctx.portfolio.openPositions.find(
                  (p) =>
                      p.baseTokenAddress === pair.to.address &&
                      p.quoteTokenAddress === pair.from.address
              )
            : undefined,
    };
}
