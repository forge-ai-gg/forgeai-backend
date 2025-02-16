import { Connection } from "@solana/web3.js";
import { JUPITER_PROGRAM_ID } from "./constants";

interface TokenBalance {
    mint: string;
    uiAmount: number;
}

export type SwapDetails = {
    inputToken: string;
    inputAmount: number;
    outputToken: string;
    outputAmount: number;
    programId?: string;
    isJupiterSwap?: boolean;
    blockHeight?: number;
    timestamp?: number;
    status?: "success" | "failed";
};

const findTokenBalanceChanges = (
    preBalances: TokenBalance[],
    postBalances: TokenBalance[]
): { [key: string]: number } => {
    const changes: { [key: string]: number } = {};

    // Combine all token mints
    const allMints = new Set([
        ...preBalances.map((b) => b.mint),
        ...postBalances.map((b) => b.mint),
    ]);

    allMints.forEach((mint) => {
        const preAmount =
            preBalances.find((b) => b.mint === mint)?.uiAmount || 0;
        const postAmount =
            postBalances.find((b) => b.mint === mint)?.uiAmount || 0;
        const change = postAmount - preAmount;
        if (change !== 0) {
            changes[mint] = change;
        }
    });

    return changes;
};

const extractTokenSwapAmounts = (transaction: any): SwapDetails => {
    const preBalances = transaction.meta.preTokenBalances || [];
    const postBalances = transaction.meta.postTokenBalances || [];
    const preNativeBalance = transaction.meta.preBalances;
    const postNativeBalance = transaction.meta.postBalances;

    // SOL and USDC mint addresses
    const SOL_MINT = "So11111111111111111111111111111111111111112";
    const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

    // Check if this is a Jupiter swap
    const isJupiterSwap =
        transaction.transaction?.message?.accountKeys?.some(
            (key: any) => key.pubkey === JUPITER_PROGRAM_ID
        ) ||
        transaction.message?.accountKeys?.some(
            (key: any) => key.toString() === JUPITER_PROGRAM_ID
        );

    // Get token balance changes
    const tokenChanges = findTokenBalanceChanges(
        preBalances.map((b) => ({
            mint: b.mint,
            uiAmount: b.uiTokenAmount.uiAmount,
        })),
        postBalances.map((b) => ({
            mint: b.mint,
            uiAmount: b.uiTokenAmount.uiAmount,
        }))
    );

    // Calculate SOL difference if it's involved
    if (
        preNativeBalance &&
        postNativeBalance &&
        preNativeBalance[0] !== postNativeBalance[0]
    ) {
        tokenChanges[SOL_MINT] =
            (postNativeBalance[0] - preNativeBalance[0]) / 1e9;
    }

    // Find input and output tokens
    const [inputToken, inputAmount] = Object.entries(tokenChanges).find(
        ([, amount]) => amount < 0
    ) || [null, 0];
    const [outputToken, outputAmount] = Object.entries(tokenChanges).find(
        ([, amount]) => amount > 0
    ) || [null, 0];

    // Check transaction status
    const status = transaction.meta.err ? "failed" : "success";

    return {
        inputToken: inputToken || SOL_MINT,
        inputAmount: Math.abs(inputAmount || 0),
        outputToken: outputToken || USDC_MINT,
        outputAmount: Math.abs(outputAmount || 0),
        programId: isJupiterSwap ? JUPITER_PROGRAM_ID : undefined,
        isJupiterSwap,
        status,
    };
};

/**
 * Get the swap details for a given transaction hash
 * @param connection - The Solana connection
 * @param txHash - The transaction hash
 * @returns The swap details
 */
export const getSwapDetails = async (
    connection: Connection,
    txHash: string
): Promise<SwapDetails | undefined> => {
    const tx = await connection.getTransaction(txHash, {
        commitment: "finalized",
        maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
        console.error("Transaction not found");
        return;
    }

    const swapDetails = extractTokenSwapAmounts(tx);

    // Add block height and timestamp
    return {
        ...swapDetails,
        blockHeight: tx.slot,
        timestamp: tx.blockTime ? tx.blockTime : undefined,
    };
};
