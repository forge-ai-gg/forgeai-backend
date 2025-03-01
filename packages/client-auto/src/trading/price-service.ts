import { Token } from "../types/trading-config";
import { TradingContext } from "../types/trading-context";

/**
 * Get token prices from the trading context
 *
 * @param ctx Trading context containing price history
 * @param tokenFrom Source token
 * @param tokenTo Destination token
 * @returns Object containing prices for both tokens
 */
export function getTokenPrices(
    ctx: TradingContext,
    tokenFrom: Token,
    tokenTo: Token
) {
    // Safely access price history which might not exist
    const fromPriceHistory = ctx.priceHistory?.[tokenFrom.address];
    const toPriceHistory = ctx.priceHistory?.[tokenTo.address];

    if (!fromPriceHistory?.prices?.length || !toPriceHistory?.prices?.length) {
        throw new Error(
            `Missing price history for tokens ${tokenFrom.symbol} or ${tokenTo.symbol}`
        );
    }

    const tokenFromPrice =
        fromPriceHistory.prices[fromPriceHistory.prices.length - 1].value;
    const tokenToPrice =
        toPriceHistory.prices[toPriceHistory.prices.length - 1].value;

    return { tokenFromPrice, tokenToPrice };
}

/**
 * Calculate profit/loss for a position
 *
 * @param params Parameters for profit/loss calculation
 * @returns Calculated profit/loss amount
 */
export function calculateProfitLoss(params: {
    entryAmount: number;
    entryPrice: number;
    exitAmount: number;
    exitPrice: number;
}): number {
    const { entryAmount, entryPrice, exitAmount, exitPrice } = params;
    return exitAmount * exitPrice - entryAmount * entryPrice;
}

/**
 * Calculate profit/loss percentage for a position
 *
 * @param params Parameters for profit/loss percentage calculation
 * @returns Calculated profit/loss percentage
 */
export function calculateProfitLossPercentage(params: {
    entryAmount: number;
    entryPrice: number;
    exitAmount: number;
    exitPrice: number;
}): number {
    const { entryAmount, entryPrice } = params;
    const initialInvestment = entryAmount * entryPrice;

    if (initialInvestment <= 0) return 0;

    const profitLoss = calculateProfitLoss(params);
    return (profitLoss / initialInvestment) * 100;
}
