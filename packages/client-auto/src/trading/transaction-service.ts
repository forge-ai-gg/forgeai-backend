import { elizaLogger } from "@elizaos/core";
import { PublicKey } from "@solana/web3.js";
import { TradingContext } from "../types/trading-context";
import { TradeDecision } from "../types/trading-decision";

const MAX_RETRIES = 3;
const BACKOFF_BASE = 1000; // ms
const DUMMY_TRANSACTION_HASH =
    "0000000000000000000000000000000000000000000000000000000000000000";

/**
 * Execute a transaction on the blockchain
 * This separates blockchain interaction from trade business logic
 */
export async function executeTransaction(
    ctx: TradingContext,
    decision: TradeDecision
): Promise<string> {
    try {
        // For paper trading, return a dummy transaction hash
        if (ctx.isPaperTrading) {
            elizaLogger.info("Paper trading mode - simulating transaction");
            return DUMMY_TRANSACTION_HASH;
        }

        // Execute the actual blockchain transaction with retry logic
        return await executeWithRetry(async () => {
            // use sak to create a trade transaction
            const tradeTx = await ctx.solanaAgent.trade(
                new PublicKey(decision.tokenPair.from.address),
                decision.amount,
                new PublicKey(decision.tokenPair.to.address)
            );

            // get the transaction details
            const txDetails = await ctx.solanaAgent.connection.getTransaction(
                tradeTx,
                {
                    maxSupportedTransactionVersion: 0,
                }
            );

            if (!txDetails) {
                throw new Error("Transaction failed to confirm");
            }

            // For now, return a dummy hash (replace with actual implementation)
            return DUMMY_TRANSACTION_HASH;
        });
    } catch (error) {
        throw new Error(`Transaction execution failed: ${error.message}`);
    }
}

/**
 * Execute a function with retry logic
 */
export async function executeWithRetry<T>(
    fn: () => Promise<T>,
    retryCount = 0
): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        if (retryCount >= MAX_RETRIES) {
            throw error;
        }

        const delay = BACKOFF_BASE * Math.pow(2, retryCount);
        elizaLogger.info(
            `Retrying after error (attempt ${retryCount + 1}/${MAX_RETRIES}): ${
                error.message
            }`
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        return executeWithRetry(fn, retryCount + 1);
    }
}
