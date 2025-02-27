import { elizaLogger } from "@elizaos/core";
import { rsi } from "technicalindicators";
import { FORCE_CLOSE_POSITION, FORCE_OPEN_POSITION } from "../lib/constants";
import { formatCurrency, formatNumber } from "../lib/formatters";
import { TradingContext } from "../types/trading-context";
import { TokenPair } from "../types/trading-strategy-config";

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
        case "rsi":
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

const evaluateRsiStrategy = ({
    ctx,
    pair,
    amount,
}: {
    ctx: TradingContext;
    pair: TokenPair;
    amount: number;
}): TradeEvaluationResult => {
    const { portfolio, tradingStrategyConfig } = ctx;
    if (!portfolio)
        return {
            shouldOpen: false,
            shouldClose: false,
            description: "Insufficient data",
            openProximity: 0,
            closeProximity: 0,
            hasOpenPosition: false,
        };

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

    const openPosition = portfolio.openPositions?.find(
        (p) =>
            p.baseTokenAddress === pair.from.address &&
            p.quoteTokenAddress === pair.to.address
    );

    const hasOpenPosition = Boolean(openPosition);

    // Calculate proximities
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
        (Boolean(hasOpenPosition) && currentRsi > overBought) ||
        FORCE_CLOSE_POSITION;
    const shouldOpen =
        (Boolean(hasOpenPosition) && currentRsi < overSold) ||
        FORCE_OPEN_POSITION;

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
        )} - Close Proximity: ${closeProximity.toFixed(2)} - Amount: ${amount}`,
    };
};

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
    const { priceHistory, portfolio } = ctx;
    if (!priceHistory || !portfolio) return "Insufficient data";

    const rsi = priceHistory[pair.to.address].prices.map((p) => p.value);
    const currentRsi = rsi[rsi.length - 1];

    return `RSI at ${currentRsi} with ${
        portfolio.openPositions?.length > 0 ? "open" : "no"
    } position`;
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
