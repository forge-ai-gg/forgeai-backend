import { elizaLogger } from "@elizaos/core";
import { Connection, PublicKey } from "@solana/web3.js";
import { SolanaAgentKit } from "solana-agent-kit";
import { EnumTradeStatus, EnumTradeType } from "../lib/enums";
import { prisma } from "../lib/prisma";
import { getSwapDetails } from "../lib/solana.utils";
import { TradingContext } from "../types/trading-context";
import { TradeDecision } from "../types/trading-decision";
import { executeSolanaTransaction } from "./solana";
import { validatePositionSize, validateTradeParameters } from "./validation";

const MAX_RETRIES = 3;
const BACKOFF_BASE = 1000; // ms
const DUMMY_TRANSACTION_HASH =
    "0000000000000000000000000000000000000000000000000000000000000000";

export type ExecutionResult = {
    decision: TradeDecision;
    transactionHash: string;
    success: boolean;
    error?: Error;
};

export async function executeTradeDecisions(
    ctx: TradingContext
): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];

    for (const decision of ctx.tradeDecisions?.filter(
        (d) => d.shouldOpen || d.shouldClose
    ) ?? []) {
        try {
            const tx = await executeTradeWithValidation({
                shouldOpen: decision.shouldOpen,
                shouldClose: decision.shouldClose,
                amountToTrade: decision.amount,
                tokenFrom: decision.token.from,
                tokenTo: decision.token.to,
                connection: ctx.connection,
                solanaAgent: ctx.solanaAgent,
                strategyAssignmentId: ctx.agentStrategyAssignment.id,
                isPaperTrading: ctx.isPaperTrading || false,
            });

            results.push({
                decision,
                transactionHash: tx,
                success: true,
            });
        } catch (error) {
            results.push({
                decision,
                transactionHash: "",
                success: false,
                error: error as Error,
            });
        }
    }

    return results;
}

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

async function validateTrade(params: {
    amountInSol: number;
    tokenTo: any;
    tokenFrom: any;
}) {
    const { amountInSol, tokenTo, tokenFrom } = params;

    const validation = await validateTradeParameters({
        amountInSol,
        tokenLiquidityUsd: tokenTo.liquidity?.usd || 0,
        tokenDailyVolumeUsd: tokenTo.volume?.h24 || 0,
        expectedSlippage: 1,
        trustScore: tokenTo.trustScore,
    });

    if (!validation.isValid) {
        throw new Error(`Trade validation failed: ${validation.reason}`);
    }

    const positionValidation = await validatePositionSize({
        amountUsd: amountInSol * (tokenFrom.price?.value || 0),
        tokenLiquidityUsd: tokenTo.liquidity?.usd || 0,
    });

    if (!positionValidation.isValid) {
        throw new Error(
            `Position size validation failed: ${positionValidation.reason}`
        );
    }
}

async function recordFailedTrade(params: {
    shouldOpen: boolean;
    tokenFrom: any;
    tokenTo: any;
    error: Error;
    strategyAssignmentId: string;
}) {
    const { shouldOpen, tokenFrom, tokenTo, error, strategyAssignmentId } =
        params;

    await prisma.transaction.create({
        data: {
            side: shouldOpen ? "BUY" : "SELL",
            status: EnumTradeStatus.FAILED,
            type: shouldOpen ? EnumTradeType.BUY : EnumTradeType.SELL,
            timestamp: new Date(),
            tokenFromAddress: tokenFrom.address,
            tokenToAddress: tokenTo.address,
            tokenFromSymbol: tokenFrom.symbol,
            tokenToSymbol: tokenTo.symbol,
            tokenFromAmount: "0",
            tokenToAmount: "0",
            tokenFromDecimals: tokenFrom.decimals,
            tokenToDecimals: tokenTo.decimals,
            tokenFromLogoURI: tokenFrom.logoURI,
            tokenToLogoURI: tokenTo.logoURI,
            feesInUsd: 0,
            failureReason: error.message,
            metadata: { error: error.stack },
            AgentStrategyAssignment: {
                connect: { id: strategyAssignmentId },
            },
            transactionHash: DUMMY_TRANSACTION_HASH,
        },
    });
}

async function recordSuccessfulTrade(params: {
    shouldOpen: boolean;
    shouldClose: boolean;
    tokenFrom: any;
    tokenTo: any;
    tx: string;
    swapDetails: any;
    strategyAssignmentId: string;
}) {
    const {
        shouldOpen,
        shouldClose,
        tokenFrom,
        tokenTo,
        tx,
        swapDetails,
        strategyAssignmentId,
    } = params;

    return await prisma.transaction.create({
        data: {
            side: shouldOpen ? "BUY" : "SELL",
            status: EnumTradeStatus.OPEN,
            type: shouldOpen ? EnumTradeType.BUY : EnumTradeType.SELL,
            timestamp: new Date(),
            tokenFromAddress: tokenFrom.address,
            tokenToAddress: tokenTo.address,
            tokenFromSymbol: tokenFrom.symbol,
            tokenToSymbol: tokenTo.symbol,
            tokenFromAmount: swapDetails?.inputAmount.toString(),
            tokenToAmount: swapDetails?.outputAmount.toString(),
            tokenFromDecimals: tokenFrom.decimals,
            tokenToDecimals: tokenTo.decimals,
            tokenFromLogoURI: tokenFrom.logoURI,
            tokenToLogoURI: tokenTo.logoURI,
            feesInUsd: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            profitLossUsd: Math.random() * 100, // TODO: Calculate actual P/L
            profitLossPercentage: Math.random() * 100,
            transactionHash: tx,
            failureReason: null,
            metadata: {},
            AgentStrategyAssignment: {
                connect: { id: strategyAssignmentId },
            },
        },
    });
}

export async function executeTradeWithValidation(params: {
    shouldOpen: boolean;
    shouldClose: boolean;
    amountToTrade: number;
    tokenFrom: any;
    tokenTo: any;
    connection: Connection;
    solanaAgent: SolanaAgentKit;
    strategyAssignmentId: string;
    isPaperTrading: boolean;
}): Promise<string> {
    const {
        shouldOpen,
        shouldClose,
        amountToTrade,
        tokenFrom,
        tokenTo,
        connection,
        solanaAgent,
        strategyAssignmentId,
        isPaperTrading,
    } = params;

    try {
        await validateTrade({
            amountInSol: amountToTrade,
            tokenTo,
            tokenFrom,
        });

        let tx = DUMMY_TRANSACTION_HASH;

        if (!isPaperTrading) {
            tx = await executeWithRetry(async () => {
                const tradeTx = await solanaAgent.trade(
                    new PublicKey(tokenFrom.address),
                    amountToTrade,
                    new PublicKey(tokenTo.address)
                );

                const txDetails = await connection.getTransaction(tradeTx, {
                    maxSupportedTransactionVersion: 0,
                });

                if (!txDetails) {
                    throw new Error("Transaction failed to confirm");
                }

                return tradeTx;
            });
        }

        const swapDetails = await getSwapDetails(connection, tx);

        if (
            !isPaperTrading &&
            (!swapDetails?.inputAmount || !swapDetails?.outputAmount)
        ) {
            throw new Error("Invalid swap details");
        }

        await recordSuccessfulTrade({
            shouldOpen,
            shouldClose,
            tokenFrom,
            tokenTo,
            tx,
            swapDetails,
            strategyAssignmentId,
        });

        return tx;
    } catch (e) {
        elizaLogger.error(`Trade execution error: ${e.message}`);
        await recordFailedTrade({
            shouldOpen,
            tokenFrom,
            tokenTo,
            error: e as Error,
            strategyAssignmentId,
        });
        throw e;
    }
}

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
