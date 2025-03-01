import { elizaLogger } from "@elizaos/core";
import { Position, Transaction } from "@prisma/client";
import { PublicKey } from "@solana/web3.js";
import { EnumTradeStatus, EnumTradeType } from "../lib/enums";
import { getSwapDetails } from "../lib/solana.utils";
import { Token } from "../types/trading-config";
import { TradingContext } from "../types/trading-context";
import { TradeDecision } from "../types/trading-decision";
import { recordFailedTrade, recordSuccessfulTrade } from "./database-service";
import { handleTradeError } from "./error";
import { getTokenPrices } from "./price-service";
import { executeTransaction } from "./transaction-service";
import { validatePositionSize, validateTradeParameters } from "./validation";

const MAX_RETRIES = 3;
const BACKOFF_BASE = 1000; // ms
const DUMMY_TRANSACTION_HASH =
    "0000000000000000000000000000000000000000000000000000000000000000";

export type TradeResult = {
    transaction: Transaction;
    position?: Position;
    success: boolean;
    error?: Error;
    errorContext?: string;
};

/**
 * Execute all trade decisions that require action
 * This function has been simplified to focus on orchestration
 * rather than implementation details
 */
export async function executeTradeDecisions(
    ctx: TradingContext
): Promise<TradeResult[]> {
    // Filter decisions that require action
    const tradesDecisionsToExecute =
        ctx.tradeDecisions?.filter((d) => d.shouldOpen || d.shouldClose) || [];

    elizaLogger.info(`Executing ${tradesDecisionsToExecute.length} trades`);

    // Execute trades in parallel
    return Promise.all(
        tradesDecisionsToExecute.map((decision) =>
            executeSingleTrade(ctx, decision)
        )
    );
}

/**
 * Execute a single trade decision
 * Improved with better separation of concerns using functional services
 */
async function executeSingleTrade(
    ctx: TradingContext,
    decision: TradeDecision
): Promise<TradeResult> {
    try {
        // Validate the trade decision
        if (!decision?.tokenPair) {
            throw new Error("Invalid trade decision: missing tokenPair");
        }

        // Validate trade parameters
        await validateTrade(ctx, decision);

        // Execute the transaction using the transaction service
        const txHash = await executeTransaction(ctx, decision);

        // Get swap details from on-chain data
        const swapDetails = await getSwapDetails({
            connection: ctx.solanaAgent.connection,
            txHash,
            isPaperTrading: ctx.isPaperTrading,
            amountToTrade: decision.amount,
            tokenTo: decision.tokenPair.to,
            tokenFrom: decision.tokenPair.from,
        });

        // Get token prices
        const { tokenFromPrice, tokenToPrice } = getTokenPrices(
            ctx,
            decision.tokenPair.from,
            decision.tokenPair.to
        );

        // Record the trade using the database service
        const { transaction, position } = await recordSuccessfulTrade({
            decision,
            txHash,
            swapDetails,
            tokenFromPrice,
            tokenToPrice,
            currentPosition: decision.position,
        });

        return {
            transaction,
            position,
            success: true,
        };
    } catch (error) {
        // Use centralized error handling
        const errorResult = await handleTradeError({
            error,
            decision,
            context: "trade execution",
        });

        // Record the failed trade
        if (decision?.tokenPair && decision?.strategyAssignmentId) {
            try {
                await recordFailedTrade({
                    decision,
                    error,
                });
            } catch (dbError) {
                elizaLogger.error(
                    "Failed to record transaction failure",
                    dbError
                );
            }
        } else {
            elizaLogger.error(
                "Could not record failed trade - missing required data",
                {
                    hasTokenPair: !!decision?.tokenPair,
                    hasStrategyId: !!decision?.strategyAssignmentId,
                }
            );
        }

        return {
            transaction: null,
            success: false,
            error,
            errorContext: "trade execution",
        };
    }
}

// execute a transaction on chain
async function executeBlockchainTransaction(
    ctx: TradingContext,
    decision: TradeDecision
): Promise<string> {
    if (ctx.isPaperTrading) {
        return DUMMY_TRANSACTION_HASH;
    }

    return executeWithRetry(async () => {
        const tradeTx = await ctx.solanaAgent.trade(
            new PublicKey(decision.tokenPair.from.address),
            decision.amount,
            new PublicKey(decision.tokenPair.to.address)
        );

        const txDetails = await ctx.solanaAgent.connection.getTransaction(
            tradeTx,
            {
                maxSupportedTransactionVersion: 0,
            }
        );

        if (!txDetails) {
            throw new Error("Transaction failed to confirm");
        }

        return DUMMY_TRANSACTION_HASH;
    });
}

// execute a function with retry logic
async function executeWithRetry<T>(
    fn: () => Promise<T>,
    retryCount = 0
): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        if (retryCount >= MAX_RETRIES) {
            throw error;
        }

        const backoffTime = BACKOFF_BASE * Math.pow(2, retryCount);
        elizaLogger.info(`Retrying after ${backoffTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoffTime));

        return executeWithRetry(fn, retryCount + 1);
    }
}

// validate the trade parameters
async function validateTrade(
    ctx: TradingContext,
    decision: TradeDecision
): Promise<void> {
    const { amount } = decision;
    const { to: tokenTo, from: tokenFrom } = decision.tokenPair;

    // Handle the case where token properties might not exist in the Token interface
    // but are added dynamically during runtime
    const tokenToAny = tokenTo as any;
    const tokenFromAny = tokenFrom as any;

    const validation = await validateTradeParameters({
        amountInSol: amount,
        tokenLiquidityUsd: tokenToAny.liquidity?.usd || 0,
        tokenDailyVolumeUsd: tokenToAny.volume?.h24 || 0,
        expectedSlippage: 1,
        trustScore: tokenToAny.trustScore,
    });

    if (!validation.isValid) {
        throw new Error(`Trade validation failed: ${validation.reason}`);
    }

    const positionValidation = await validatePositionSize({
        amountUsd: amount * (tokenFromAny.price?.value || 0),
        tokenLiquidityUsd: tokenToAny.liquidity?.usd || 0,
    });

    if (!positionValidation.isValid) {
        throw new Error(
            `Position size validation failed: ${positionValidation.reason}`
        );
    }
}

// calculate the profit loss
function calculateProfitLoss(params: {
    currentPosition?: Position;
    swapDetails: any;
    tokenTo: Token;
    tokenFromPrice: number;
    tokenToPrice: number;
}) {
    if (!params.currentPosition) return 0;
    const exitAmount = params.swapDetails?.outputAmount || 0;
    const exitPrice = params.tokenToPrice;
    const entryAmount = parseFloat(params.currentPosition.totalBaseAmount);
    const entryPrice = params.tokenFromPrice;
    return exitAmount * exitPrice - entryAmount * entryPrice;
}

// calculate the profit loss percentage
function calculateProfitLossPercentage(params: {
    currentPosition?: Position;
    swapDetails: any;
    tokenTo: Token;
    tokenFromPrice: number;
    tokenToPrice: number;
}) {
    if (!params.currentPosition) return 0;
    const profitLoss = calculateProfitLoss(params);
    const entryAmount = parseFloat(params.currentPosition.totalBaseAmount);
    const entryPrice = params.currentPosition.entryPrice || 0;
    const initialInvestment = entryAmount * entryPrice;
    return initialInvestment > 0 ? (profitLoss / initialInvestment) * 100 : 0;
}

// build the data for a transaction
function buildTransactionData(params: {
    decision: TradeDecision;
    txHash: string;
    swapDetails: any;
    prices: { tokenFromPrice: number; tokenToPrice: number };
}) {
    const { decision, txHash, swapDetails, prices } = params;
    const { from, to } = decision.tokenPair;

    if (!decision.strategyAssignmentId) {
        throw new Error("Missing strategyAssignmentId in transaction");
    }

    return {
        strategyAssignmentId: decision.strategyAssignmentId,
        side: decision.shouldOpen ? "BUY" : "SELL",
        status: EnumTradeStatus.OPEN,
        type: decision.shouldOpen ? EnumTradeType.BUY : EnumTradeType.SELL,
        timestamp: new Date(),
        tokenFromAddress: from.address,
        tokenToAddress: to.address,
        tokenFromSymbol: from.symbol,
        tokenToSymbol: to.symbol,
        tokenFromAmount: swapDetails?.inputAmount.toString(),
        tokenToAmount: swapDetails?.outputAmount.toString(),
        tokenFromDecimals: from.decimals,
        tokenToDecimals: to.decimals,
        tokenFromLogoURI: from.logoURI,
        tokenToLogoURI: to.logoURI,
        tokenFromPrice: prices.tokenFromPrice,
        tokenToPrice: prices.tokenToPrice,
        feesInUsd: 0,
        profitLossUsd: decision.shouldClose
            ? calculateProfitLoss({
                  currentPosition: decision.position,
                  swapDetails,
                  tokenTo: to,
                  tokenFromPrice: prices.tokenFromPrice,
                  tokenToPrice: prices.tokenToPrice,
              })
            : 0,
        profitLossPercentage: decision.shouldClose
            ? calculateProfitLossPercentage({
                  currentPosition: decision.position,
                  swapDetails,
                  tokenTo: to,
                  tokenFromPrice: prices.tokenFromPrice,
                  tokenToPrice: prices.tokenToPrice,
              })
            : 0,
        transactionHash: txHash,
        failureReason: null,
        metadata: {},
    };
}

// build the data for an open position
function buildOpenPositionData(params: {
    decision: TradeDecision;
    swapDetails: any;
    prices: { tokenFromPrice: number; tokenToPrice: number };
    transactionData: any;
}) {
    const { decision, swapDetails, prices, transactionData } = params;
    const { from, to } = decision.tokenPair;

    if (!decision.strategyAssignmentId) {
        throw new Error("Missing strategyAssignmentId in trade decision");
    }

    return {
        status: EnumTradeStatus.OPEN,
        openedAt: new Date(),
        baseTokenAddress: to.address,
        baseTokenSymbol: to.symbol,
        baseTokenDecimals: to.decimals,
        baseTokenLogoURI: to.logoURI,
        quoteTokenAddress: from.address,
        quoteTokenSymbol: from.symbol,
        quoteTokenDecimals: from.decimals,
        quoteTokenLogoURI: from.logoURI,
        entryPrice: prices.tokenFromPrice,
        totalBaseAmount: swapDetails?.inputAmount.toString(),
        averageEntryPrice: prices.tokenFromPrice,
        side: "LONG",
        strategyAssignmentId: decision.strategyAssignmentId,
        Transaction: {
            create: [transactionData],
        },
    };
}

// build the data for a closed position
function buildClosePositionData({
    prices,
    currentPosition,
    swapDetails,
    tokenTo,
}: {
    prices: { tokenFromPrice: number; tokenToPrice: number };
    currentPosition: Position;
    swapDetails: any;
    tokenTo: Token;
}) {
    return {
        status: EnumTradeStatus.CLOSED,
        exitPrice: prices.tokenToPrice,
        closedAt: new Date(),
        realizedPnlUsd: calculateProfitLoss({
            currentPosition,
            swapDetails,
            tokenTo,
            ...prices,
        }),
    };
}

// build the data for a failed transaction
function buildFailedTransactionData(params: {
    decision: TradeDecision;
    error: Error;
}) {
    const { decision, error } = params;

    if (!decision?.tokenPair) {
        throw new Error("Invalid trade decision: missing tokenPair");
    }

    if (!decision.strategyAssignmentId) {
        throw new Error(
            "Missing strategyAssignmentId in failed trade decision"
        );
    }

    const { from, to } = decision.tokenPair;

    return {
        side: decision.shouldOpen ? "BUY" : "SELL",
        status: EnumTradeStatus.FAILED,
        type: decision.shouldOpen ? EnumTradeType.BUY : EnumTradeType.SELL,
        timestamp: new Date(),
        tokenFromAddress: from.address,
        tokenToAddress: to.address,
        tokenFromSymbol: from.symbol,
        tokenToSymbol: to.symbol,
        tokenFromAmount: "0",
        tokenToAmount: "0",
        tokenFromDecimals: from.decimals,
        tokenToDecimals: to.decimals,
        tokenFromLogoURI: from.logoURI,
        tokenToLogoURI: to.logoURI,
        feesInUsd: 0,
        failureReason: error.message,
        metadata: { error: error.stack },
        strategyAssignmentId: decision.strategyAssignmentId,
        transactionHash: DUMMY_TRANSACTION_HASH,
    };
}
