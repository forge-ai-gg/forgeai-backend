import { Connection } from "@solana/web3.js";
import { BIRDEYE_BASE_URL } from "../lib/birdeye";
import { config } from "../lib/config";
import { WalletPortfolioResponse } from "../types/birdeye/api/wallet";
export async function getWalletPortfolio(
    publicKey: string
): Promise<WalletPortfolioResponse> {
    const response = await fetch(
        `${BIRDEYE_BASE_URL}/v1/wallet/token_list?wallet=${publicKey}`,
        {
            headers: {
                accept: "application/json",
                "x-chain": "solana",
                "X-API-KEY": config.BIRDEYE_API_KEY,
            },
        }
    );

    const data = await response.json();
    return data;
}

export async function executeSolanaTransaction(params: {
    connection: Connection;
    fromToken: string;
    toToken: string;
    amount: number;
    wallet: string;
}): Promise<string> {
    // Implement actual Solana transaction
    // This is a placeholder - implement actual Jupiter/Orca swap
    return "transaction_hash";
}

export async function getTransactionDetails(
    connection: Connection,
    tx: string
) {
    return await connection.getTransaction(tx, {
        maxSupportedTransactionVersion: 0,
    });
}
