import { EnumStrategyType } from "@/lib/enums";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { TradingContext } from "@/types/trading-context";
import { TokenPair } from "@/types/trading-strategy-config";
import { elizaLogger } from "@elizaos/core";
import { evaluateRsiStrategy, generateRsiTradeReason } from "./strategies/rsi";

export type TradeEvaluationResult = {
    shouldOpen: boolean;
    shouldClose: boolean;
    description: string;
    hasOpenPosition: boolean;
    openProximity: number; // 0-1 representing how close we are to opening
    closeProximity: number; // 0-1 representing how close we are to closing
};

export function evaluateStrategy({
    ctx,
    pair,
    index,
    amount,
}: {
    ctx: TradingContext;
    pair: TokenPair;
    index: number;
    amount: number;
}): TradeEvaluationResult {
    const { priceHistory, portfolio, tradingStrategyConfig } = ctx;
    if (!priceHistory || !portfolio)
        return {
            shouldOpen: false,
            shouldClose: false,
            description: "Insufficient data",
            openProximity: 0,
            closeProximity: 0,
            hasOpenPosition: false,
        };

    const tradingPair = tradingStrategyConfig.tokenPairs[index];

    // get the type of the trading strategy that is used to branch logic to determine the strategy to use
    const { type } = tradingStrategyConfig;

    switch (type) {
        case EnumStrategyType.RSI:
            return evaluateRsiStrategy({
                ctx,
                pair: tradingPair,
                amount,
            });
        default:
            return {
                shouldOpen: false,
                shouldClose: false,
                description: "Unsupported strategy type",
                openProximity: 0,
                closeProximity: 0,
                hasOpenPosition: false,
            };
    }
}

export function calculateTradeAmount({
    ctx,
    pair,
}: {
    ctx: TradingContext;
    pair: TokenPair;
}): number {
    const { portfolio, tradingStrategyConfig } = ctx;
    if (!portfolio) {
        elizaLogger.info("No portfolio found, returning 0");
        return 0;
    }

    const fromSymbol = pair.from.symbol;
    elizaLogger.info(`Calculating trade amount for ${fromSymbol}`);

    // Get wallet balance for the token we want to trade
    const walletBalance = portfolio.walletPortfolioItems?.find(
        (b) => b.symbol === fromSymbol
    );
    if (!walletBalance) {
        elizaLogger.info(
            `No wallet balance found for ${fromSymbol}, returning 0`
        );
        return 0;
    }
    elizaLogger.info(
        `Wallet balance for ${fromSymbol}: amount=${walletBalance.uiAmount}, valueUsd=${walletBalance.valueUsd}, priceUsd=${walletBalance.priceUsd}`
    );

    // Calculate total portfolio value in USD
    const totalPortfolioValue =
        portfolio.walletPortfolioItems?.reduce(
            (sum, item) => sum + item.valueUsd,
            0
        ) ?? 0;
    elizaLogger.info(`Total portfolio value (USD): ${totalPortfolioValue}`);

    // Calculate max allocation in USD
    const maxAllocationUsd =
        (totalPortfolioValue * tradingStrategyConfig.maxPortfolioAllocation) /
        100;
    if (isNaN(maxAllocationUsd)) {
        elizaLogger.info(
            `Max allocation calculation resulted in NaN, returning 0`
        );
        return 0;
    }
    elizaLogger.info(
        `Max allocation (USD): ${maxAllocationUsd} (${tradingStrategyConfig.maxPortfolioAllocation}% of portfolio)`
    );

    // Find existing position amount for this token
    const existingPosition = portfolio.openPositions?.find(
        (p) => p.baseTokenSymbol === fromSymbol
    );
    let existingPositionValueUsd =
        Number(existingPosition?.totalBaseAmount) ?? 0;
    if (isNaN(existingPositionValueUsd)) {
        elizaLogger.info(`Existing position value is NaN, using 0`);
        existingPositionValueUsd = 0;
    }
    elizaLogger.info(
        `Existing position value (USD): ${existingPositionValueUsd}`
    );

    // Calculate remaining allocation available in USD
    const remainingAllocationUsd = Math.max(
        0,
        maxAllocationUsd - existingPositionValueUsd
    );
    if (isNaN(remainingAllocationUsd)) {
        elizaLogger.info(
            `Remaining allocation calculation resulted in NaN, returning 0`
        );
        return 0;
    }
    elizaLogger.info(
        `Remaining allocation (USD): ${formatCurrency(remainingAllocationUsd)}`
    );

    // Convert USD allocation to token amount
    const availableTokenAmount =
        remainingAllocationUsd / walletBalance.priceUsd;
    if (isNaN(availableTokenAmount)) {
        elizaLogger.info(
            `Available token amount calculation resulted in NaN, returning 0`
        );
        return 0;
    }
    elizaLogger.info(
        `Available token amount: ${formatNumber(availableTokenAmount, {
            maximumFractionDigits: 6,
        })}`
    );

    // Return the smaller of available allocation or wallet balance
    const finalAmount = Math.min(
        availableTokenAmount,
        Number(walletBalance.uiAmount)
    );
    if (isNaN(finalAmount)) {
        elizaLogger.info(
            `Preliminary amount calculation resulted in NaN, returning 0`
        );
        return 0;
    }
    elizaLogger.info(
        `Preliminary trade amount: ${formatCurrency(finalAmount)}`
    );

    // trim the amount based on the number of decimals
    const decimals = pair.from.decimals;
    const trimmedAmount =
        Math.floor(finalAmount * 10 ** decimals) / 10 ** decimals;
    elizaLogger.info(`Trimmed trade amount: ${formatCurrency(trimmedAmount)}`);

    return trimmedAmount;
}

export function generateTradeReason(
    ctx: TradingContext,
    pair: TokenPair
): string {
    const { tradingStrategyConfig } = ctx;
    const { type } = tradingStrategyConfig;

    switch (type) {
        case EnumStrategyType.RSI:
            return generateRsiTradeReason(ctx, pair);
        default:
            return "Unsupported strategy type";
    }
}

export function calculateConfidence(ctx: TradingContext): number {
    const { priceHistory, portfolio, tradingStrategyConfig } = ctx;
    if (!priceHistory || !portfolio) return 0;

    const evaluationResults = tradingStrategyConfig.tokenPairs.map(
        (pair, index) => evaluateStrategy({ ctx, pair, index, amount: 0 })
    );

    // Return the highest proximity value (whether it's for opening or closing)
    return Math.max(
        ...evaluationResults.map((result) =>
            Math.max(result.openProximity, result.closeProximity)
        )
    );
}
