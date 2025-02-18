import { elizaLogger } from "@elizaos/core";
import { Position } from "@prisma/client";
import { Connection, PublicKey } from "@solana/web3.js";
import { SolanaAgentKit } from "solana-agent-kit";
import { EnumTradeStatus, EnumTradeType } from "../lib/enums";
import { prisma } from "../lib/prisma";
import { getSwapDetails } from "../lib/solana.utils";
import { Token } from "../types/trading-config";
import { TradingContext } from "../types/trading-context";
import { TradeDecision } from "../types/trading-decision";
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

    const tradesDecisionsToExecute = ctx.tradeDecisions?.filter(
        (d) => d.shouldOpen || d.shouldClose
    );

    elizaLogger.info(`Executing ${tradesDecisionsToExecute?.length} trades`);

    // todo - consider serial vs parallel execution
    for (const decision of tradesDecisionsToExecute) {
        elizaLogger.info(
            `Executing trade ${decision.description} (${decision.amount})`
        );
        elizaLogger.info(JSON.stringify(decision, null, 2));
        let i = 0;
        try {
            elizaLogger.log(
                `Executing trade ${i} of ${tradesDecisionsToExecute?.length}: ${decision.description}`
            );
            const tx = await executeTradeWithValidation({
                ctx,
                shouldOpen: decision.shouldOpen,
                shouldClose: decision.shouldClose,
                tokenAmountToTrade: decision.amount,
                tokenFrom: decision.tokenPair.from,
                tokenTo: decision.tokenPair.to,
                connection: ctx.connection,
                solanaAgent: ctx.solanaAgent,
                strategyAssignmentId: ctx.agentStrategyAssignment.id,
                isPaperTrading: ctx.isPaperTrading,
            });

            results.push({
                decision,
                transactionHash: tx,
                success: true,
            });
        } catch (error) {
            elizaLogger.error(
                `Error executing trade ${i} of ${tradesDecisionsToExecute?.length}: ${error.message}`
            );
            results.push({
                decision,
                transactionHash: "",
                success: false,
                error: error as Error,
            });
        }
        i++;
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
    amount: number;
    tokenTo: any;
    tokenFrom: any;
}) {
    const { amount, tokenTo, tokenFrom } = params;

    const validation = await validateTradeParameters({
        amountInSol: amount,
        tokenLiquidityUsd: tokenTo.liquidity?.usd || 0,
        tokenDailyVolumeUsd: tokenTo.volume?.h24 || 0,
        expectedSlippage: 1,
        trustScore: tokenTo.trustScore,
    });

    if (!validation.isValid) {
        throw new Error(`Trade validation failed: ${validation.reason}`);
    }

    const positionValidation = await validatePositionSize({
        amountUsd: amount * (tokenFrom.price?.value || 0),
        tokenLiquidityUsd: tokenTo.liquidity?.usd || 0,
    });

    if (!positionValidation.isValid) {
        throw new Error(
            `Position size validation failed: ${positionValidation.reason}`
        );
    }
}

export async function executeTradeWithValidation(params: {
    ctx: TradingContext;
    shouldOpen: boolean;
    shouldClose: boolean;
    tokenAmountToTrade: number;
    tokenFrom: Token;
    tokenTo: Token;
    connection: Connection;
    solanaAgent: SolanaAgentKit;
    strategyAssignmentId: string;
    isPaperTrading: boolean;
    currentPosition?: Position;
}): Promise<string> {
    const {
        ctx,
        shouldOpen,
        shouldClose,
        tokenAmountToTrade,
        tokenFrom,
        tokenTo,
        connection,
        solanaAgent,
        strategyAssignmentId,
        isPaperTrading,
    } = params;

    try {
        await validateTrade({
            amount: tokenAmountToTrade,
            tokenTo,
            tokenFrom,
        });

        elizaLogger.info(`isPaperTrading: ${isPaperTrading}`);

        // execute the trade
        const tx = isPaperTrading
            ? DUMMY_TRANSACTION_HASH
            : await executeWithRetry(async () => {
                  const tradeTx = await solanaAgent.trade(
                      new PublicKey(tokenFrom.address),
                      tokenAmountToTrade,
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

        // get swap details after the tx to get the 'final' state of the trade
        // for paper trading, we assume a 'perfect' trade
        const swapDetails = await getSwapDetails({
            connection,
            txHash: tx,
            isPaperTrading,
            amountToTrade: tokenAmountToTrade,
            tokenTo,
            tokenFrom,
        });
        elizaLogger.info(`Swap details: ${JSON.stringify(swapDetails)}`);

        if (
            !isPaperTrading &&
            (!swapDetails?.inputAmount || !swapDetails?.outputAmount)
        ) {
            throw new Error("Invalid swap details");
        }

        await recordSuccessfulTx({
            ctx,
            shouldOpen,
            shouldClose,
            tokenFrom,
            tokenTo,
            tx,
            swapDetails,
            strategyAssignmentId,
            currentPosition: params.currentPosition,
        });

        return tx;
    } catch (e) {
        elizaLogger.error(`Trade execution error: ${e.message}`);
        await recordFailedTx({
            shouldOpen,
            tokenFrom,
            tokenTo,
            error: e as Error,
            strategyAssignmentId,
        });
        throw e;
    }
}

async function recordFailedTx(params: {
    shouldOpen: boolean;
    tokenFrom: Token;
    tokenTo: Token;
    error: Error;
    strategyAssignmentId: string;
    currentPosition?: Position;
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

async function recordSuccessfulTx(params: {
    ctx: TradingContext;
    shouldOpen: boolean;
    shouldClose: boolean;
    tokenFrom: Token;
    tokenTo: Token;
    tx: string;
    swapDetails: any;
    strategyAssignmentId: string;
    currentPosition?: Position;
}) {
    const {
        ctx,
        shouldOpen,
        shouldClose,
        tokenFrom,
        tokenTo,
        tx,
        swapDetails,
        strategyAssignmentId,
        currentPosition,
    } = params;

    const tokenFromPrice =
        ctx.priceHistory?.find((p) =>
            p.from.find((f) => f.address === tokenFrom.address)
        )?.from[0].value || 0;

    const tokenToPrice =
        ctx.priceHistory?.find((p) =>
            p.to.find((t) => t.address === tokenTo.address)
        )?.to[0].value || 0;

    if (!tokenFromPrice || !tokenToPrice) {
        throw new Error("Invalid price history when building transaction");
    }

    // Create or close position based on trade type
    let position;
    if (shouldOpen) {
        position = await prisma.position.create({
            data: {
                status: EnumTradeStatus.OPEN,
                openedAt: new Date(),
                baseTokenAddress: tokenTo.address,
                baseTokenSymbol: tokenTo.symbol,
                baseTokenDecimals: tokenTo.decimals,
                baseTokenLogoURI: tokenTo.logoURI,
                quoteTokenAddress: tokenFrom.address,
                quoteTokenSymbol: tokenFrom.symbol,
                quoteTokenDecimals: tokenFrom.decimals,
                quoteTokenLogoURI: tokenFrom.logoURI,
                entryPrice: tokenFromPrice,
                totalBaseAmount: swapDetails?.inputAmount.toString() || "0",
                averageEntryPrice: tokenFromPrice,
                side: "LONG",
                AgentStrategyAssignment: {
                    connect: { id: strategyAssignmentId },
                },
                Transaction: {
                    create: [
                        {
                            strategyAssignmentId,
                            side: shouldOpen ? "BUY" : "SELL",
                            status: EnumTradeStatus.OPEN,
                            type: shouldOpen
                                ? EnumTradeType.BUY
                                : EnumTradeType.SELL,
                            timestamp: new Date(),
                            tokenFromAddress: tokenFrom.address,
                            tokenToAddress: tokenTo.address,
                            tokenFromSymbol: tokenFrom.symbol,
                            tokenToSymbol: tokenTo.symbol,
                            tokenFromAmount:
                                swapDetails?.inputAmount.toString(),
                            tokenToAmount: swapDetails?.outputAmount.toString(),
                            tokenFromDecimals: tokenFrom.decimals,
                            tokenToDecimals: tokenTo.decimals,
                            tokenFromLogoURI: tokenFrom.logoURI,
                            tokenToLogoURI: tokenTo.logoURI,
                            tokenFromPrice: tokenFromPrice,
                            tokenToPrice: tokenToPrice,
                            feesInUsd: 0,
                            profitLossUsd: shouldClose
                                ? calculateProfitLoss({
                                      ...params,
                                      tokenFromPrice,
                                      tokenToPrice,
                                  })
                                : 0,
                            profitLossPercentage: shouldClose
                                ? calculateProfitLossPercentage({
                                      ...params,
                                      tokenFromPrice,
                                      tokenToPrice,
                                  })
                                : 0,
                            transactionHash: tx,
                            failureReason: null,
                            metadata: {},
                        },
                    ],
                },
            },
        });
    } else if (shouldClose && currentPosition) {
        position = await prisma.position.update({
            where: { id: currentPosition.id },
            data: {
                status: EnumTradeStatus.CLOSED,
                exitPrice: tokenToPrice,
                closedAt: new Date(),
                realizedPnlUsd: calculateProfitLoss({
                    ...params,
                    tokenFromPrice,
                    tokenToPrice,
                }),
            },
        });
    }
}

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
