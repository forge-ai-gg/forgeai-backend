import { elizaLogger } from "@elizaos/core";
import { Connection, PublicKey } from "@solana/web3.js";
import { SolanaAgentKit } from "solana-agent-kit";
import { ITradingService } from "../interfaces/services";
import { EnumTradeStatus, EnumTradeType } from "../lib/enums";
import { prisma } from "../lib/prisma";
import { getSwapDetails } from "../lib/solana.utils";
import { TradingStrategyConfig } from "../types/trading-strategy-config";
import { ConfigService } from "./config.service";

const MAX_RETRIES = 3;
const BACKOFF_BASE = 1000; // ms
const DUMMY_TRANSACTION_HASH =
    "0000000000000000000000000000000000000000000000000000000000000000";

export class TradingService implements ITradingService {
    private retryCount: number = 0;
    private configService: ConfigService;

    constructor(
        private connection: Connection,
        private solanaAgent: SolanaAgentKit,
        private strategyConfig: TradingStrategyConfig,
        private strategyAssignmentId: string,
        private isPaperTrading: boolean,
        configService?: ConfigService
    ) {
        this.configService = configService || new ConfigService();
    }

    async executeTrade(
        shouldBuy: boolean,
        amountToTrade: number,
        tokenFrom: any,
        tokenTo: any
    ): Promise<string> {
        // Validate trade parameters
        const validation = await this.configService.validateTradeParameters({
            amountInSol: amountToTrade,
            tokenLiquidityUsd: tokenTo.liquidity?.usd || 0,
            tokenDailyVolumeUsd: tokenTo.volume?.h24 || 0,
            expectedSlippage: 1, // TODO: Get actual slippage from Jupiter quote
            trustScore: tokenTo.trustScore,
        });

        if (!validation.isValid) {
            throw new Error(`Trade validation failed: ${validation.reason}`);
        }

        // Position size validation
        const positionValidation =
            await this.configService.validatePositionSize({
                amountUsd: amountToTrade * (tokenFrom.price?.value || 0),
                tokenLiquidityUsd: tokenTo.liquidity?.usd || 0,
            });

        if (!positionValidation.isValid) {
            throw new Error(
                `Position size validation failed: ${positionValidation.reason}`
            );
        }

        let tx = DUMMY_TRANSACTION_HASH;

        try {
            if (!this.isPaperTrading) {
                tx = await this.executeWithRetry(async () => {
                    const tradeTx = await this.solanaAgent.trade(
                        new PublicKey(tokenFrom.address),
                        amountToTrade,
                        new PublicKey(tokenTo.address)
                    );

                    // Validate transaction
                    const txDetails = await this.connection.getTransaction(
                        tradeTx,
                        {
                            maxSupportedTransactionVersion: 0,
                        }
                    );

                    if (!txDetails) {
                        throw new Error("Transaction failed to confirm");
                    }

                    return tradeTx;
                });
            }

            const swapDetails = await getSwapDetails(this.connection, tx);

            // Validate swap details
            if (
                !this.isPaperTrading &&
                (!swapDetails?.inputAmount || !swapDetails?.outputAmount)
            ) {
                throw new Error("Invalid swap details");
            }

            await this.recordTrade({
                shouldBuy,
                tokenFrom,
                tokenTo,
                tx,
                swapDetails,
            });

            this.retryCount = 0; // Reset retry count on success
            return tx;
        } catch (e) {
            elizaLogger.error(`Trade execution error: ${JSON.stringify(e)}`);
            await this.recordFailedTrade(
                shouldBuy,
                tokenFrom,
                tokenTo,
                e as Error
            );
            throw e;
        }
    }

    private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
        try {
            return await fn();
        } catch (error) {
            if (this.retryCount >= MAX_RETRIES) {
                this.retryCount = 0;
                throw error;
            }

            const backoffTime = BACKOFF_BASE * Math.pow(2, this.retryCount);
            elizaLogger.info(`Retrying after ${backoffTime}ms...`);
            await new Promise((resolve) => setTimeout(resolve, backoffTime));

            this.retryCount++;
            return this.executeWithRetry(fn);
        }
    }

    private async recordFailedTrade(
        shouldBuy: boolean,
        tokenFrom: any,
        tokenTo: any,
        error: Error
    ) {
        await prisma.tradeHistory.create({
            data: {
                side: shouldBuy ? "BUY" : "SELL",
                status: EnumTradeStatus.FAILED,
                type: shouldBuy ? EnumTradeType.BUY : EnumTradeType.SELL,
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
                entryPrice: 0,
                exitPrice: 0,
                feesInUsd: 0,
                failureReason: error.message,
                metadata: { error: error.stack },
                AgentStrategyAssignment: {
                    connect: { id: this.strategyAssignmentId },
                },
                transactionHash: DUMMY_TRANSACTION_HASH,
            },
        });
    }

    private async recordTrade({
        shouldBuy,
        tokenFrom,
        tokenTo,
        tx,
        swapDetails,
    }: any) {
        return await prisma.tradeHistory.create({
            data: {
                side: shouldBuy ? "BUY" : "SELL",
                status: EnumTradeStatus.OPEN,
                type: shouldBuy ? EnumTradeType.BUY : EnumTradeType.SELL,
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
                entryPrice: 0,
                exitPrice: 0,
                feesInUsd: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
                profitLossUsd: Math.random() * 100, // TODO: Calculate actual P/L
                profitLossPercentage: Math.random() * 100,
                transactionHash: tx,
                failureReason: null,
                metadata: {},
                AgentStrategyAssignment: {
                    connect: { id: this.strategyAssignmentId },
                },
            },
        });
    }
}
