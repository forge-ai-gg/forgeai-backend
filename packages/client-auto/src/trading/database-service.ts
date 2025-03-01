import { elizaLogger } from "@elizaos/core";
import { Position, Transaction } from "@prisma/client";
import {
    EnumPositionStatus,
    EnumTradeStatus,
    EnumTradeType,
} from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { TradeDecision } from "@/types/trading-decision";

/**
 * Record a successful trade in the database
 * This separates database interaction from trade business logic
 */
export async function recordSuccessfulTrade(params: {
    decision: TradeDecision;
    txHash: string;
    swapDetails: any;
    tokenFromPrice: number;
    tokenToPrice: number;
    currentPosition?: Position;
}): Promise<{ transaction: Transaction; position?: Position }> {
    const {
        decision,
        txHash,
        swapDetails,
        tokenFromPrice,
        tokenToPrice,
        currentPosition,
    } = params;

    try {
        elizaLogger.info(`Recording successful trade: ${txHash}`);

        // Create transaction record
        const transactionData = buildTransactionData({
            decision,
            txHash,
            swapDetails,
            tokenFromPrice,
            tokenToPrice,
        });

        const transaction = await prisma.transaction.create({
            data: transactionData,
        });

        let position: Position | undefined = undefined;

        // Handle position creation or update based on trade type
        if (decision.shouldOpen) {
            // Create new position for opening trade
            const positionData = buildOpenPositionData({
                decision,
                swapDetails,
                transaction,
            });

            position = await prisma.position.create({
                data: positionData,
            });
        } else if (decision.shouldClose && currentPosition) {
            // Update existing position for closing trade
            const positionUpdateData = buildClosePositionData({
                currentPosition,
                swapDetails,
                tokenFromPrice,
                tokenToPrice,
            });

            position = await prisma.position.update({
                where: { id: currentPosition.id },
                data: positionUpdateData,
            });
        }

        return { transaction, position };
    } catch (error) {
        elizaLogger.error("Failed to record trade in database:", error);
        throw error;
    }
}

/**
 * Record a failed trade in the database
 */
export async function recordFailedTrade(params: {
    decision: TradeDecision;
    error: Error;
}): Promise<Transaction> {
    try {
        elizaLogger.info(
            `Recording failed trade for ${params.decision.tokenPair?.from.symbol} -> ${params.decision.tokenPair?.to.symbol}`
        );

        const transactionData = buildFailedTransactionData(params);

        return await prisma.transaction.create({
            data: transactionData,
        });
    } catch (error) {
        elizaLogger.error("Failed to record failed trade:", error);
        throw error;
    }
}

/**
 * Calculate profit/loss for a position
 */
export function calculateProfitLoss(params: {
    entryAmount: number;
    exitAmount: number;
}): number {
    return params.exitAmount - params.entryAmount;
}

/**
 * Calculate profit/loss percentage for a position
 */
export function calculateProfitLossPercentage(params: {
    entryAmount: number;
    exitAmount: number;
}): number {
    if (params.entryAmount === 0) return 0;
    const profitLoss = calculateProfitLoss(params);
    return (profitLoss / params.entryAmount) * 100;
}

/**
 * Build transaction data for database
 */
function buildTransactionData({
    decision,
    txHash,
    swapDetails,
    tokenFromPrice,
    tokenToPrice,
}: {
    decision: TradeDecision;
    txHash: string;
    swapDetails: any;
    tokenFromPrice: number;
    tokenToPrice: number;
}): any {
    const { tokenPair, strategyAssignmentId, position } = decision;
    const { from: tokenFrom, to: tokenTo } = tokenPair;

    return {
        strategyAssignmentId,
        side: decision.shouldOpen ? "BUY" : "SELL",
        status: EnumTradeStatus.CLOSED,
        type: decision.shouldOpen ? EnumTradeType.BUY : EnumTradeType.SELL,
        timestamp: new Date(),
        tokenFromAddress: tokenFrom.address,
        tokenToAddress: tokenTo.address,
        tokenFromSymbol: tokenFrom.symbol,
        tokenToSymbol: tokenTo.symbol,
        tokenFromAmount: String(swapDetails.inputAmount),
        tokenToAmount: String(swapDetails.outputAmount),
        tokenFromDecimals: tokenFrom.decimals,
        tokenToDecimals: tokenTo.decimals,
        tokenFromLogoURI: tokenFrom.logoURI,
        tokenToLogoURI: tokenTo.logoURI,
        tokenFromPrice: tokenFromPrice,
        tokenToPrice: tokenToPrice,
        feesInUsd: 0, // Would calculate from swapDetails
        profitLossUsd: 0, // Would calculate for closing trades
        profitLossPercentage: 0, // Would calculate for closing trades
        transactionHash: txHash,
        failureReason: null,
        metadata: {},
        positionId: position?.id,
    };
}

/**
 * Build position data for opening a new position
 */
function buildOpenPositionData({
    decision,
    swapDetails,
    transaction,
}: {
    decision: TradeDecision;
    swapDetails: any;
    transaction: Transaction;
}): any {
    const { tokenPair, strategyAssignmentId } = decision;
    const { from: tokenFrom, to: tokenTo } = tokenPair;

    return {
        strategyAssignmentId,
        status: EnumPositionStatus.OPEN,
        baseTokenAddress: tokenTo.address,
        baseTokenSymbol: tokenTo.symbol,
        baseTokenDecimals: tokenTo.decimals,
        baseTokenLogoURI: tokenTo.logoURI,
        quoteTokenAddress: tokenFrom.address,
        quoteTokenSymbol: tokenFrom.symbol,
        quoteTokenDecimals: tokenFrom.decimals,
        quoteTokenLogoURI: tokenFrom.logoURI,
        entryPrice: swapDetails.executionPrice,
        exitPrice: null,
        totalBaseAmount: String(swapDetails.outputAmount),
        averageEntryPrice: swapDetails.executionPrice,
        realizedPnlUsd: null,
        totalFeesUsd: 0,
        side: "buy",
        metadata: {},
        openedAt: new Date(),
        closedAt: null,
    };
}

/**
 * Build position update data for closing a position
 */
function buildClosePositionData({
    currentPosition,
    swapDetails,
    tokenFromPrice,
    tokenToPrice,
}: {
    currentPosition: Position;
    swapDetails: any;
    tokenFromPrice: number;
    tokenToPrice: number;
}): any {
    const entryAmount =
        parseFloat(currentPosition.totalBaseAmount) *
        currentPosition.entryPrice;
    const exitAmount = swapDetails.outputAmount * tokenToPrice;
    const pnl = exitAmount - entryAmount;
    const pnlPercentage = entryAmount > 0 ? (pnl / entryAmount) * 100 : 0;

    return {
        status: EnumPositionStatus.CLOSED,
        exitPrice: swapDetails.executionPrice,
        realizedPnlUsd: pnl,
        closedAt: new Date(),
    };
}

/**
 * Build transaction data for a failed trade
 */
function buildFailedTransactionData({
    decision,
    error,
}: {
    decision: TradeDecision;
    error: Error;
}): any {
    const { tokenPair, strategyAssignmentId } = decision;
    const { from: tokenFrom, to: tokenTo } = tokenPair;

    return {
        strategyAssignmentId,
        side: decision.shouldOpen ? "BUY" : "SELL",
        status: EnumTradeStatus.FAILED,
        type: decision.shouldOpen ? EnumTradeType.BUY : EnumTradeType.SELL,
        timestamp: new Date(),
        tokenFromAddress: tokenFrom.address,
        tokenToAddress: tokenTo.address,
        tokenFromSymbol: tokenFrom.symbol,
        tokenToSymbol: tokenTo.symbol,
        tokenFromAmount: String(decision.amount),
        tokenToAmount: "0",
        tokenFromDecimals: tokenFrom.decimals,
        tokenToDecimals: tokenTo.decimals,
        tokenFromLogoURI: tokenFrom.logoURI,
        tokenToLogoURI: tokenTo.logoURI,
        tokenFromPrice: 0,
        tokenToPrice: 0,
        feesInUsd: 0,
        profitLossUsd: 0,
        profitLossPercentage: 0,
        transactionHash: null,
        failureReason: error.message,
        metadata: {},
        positionId: decision.position?.id,
    };
}
