import { WalletPortfolioResponse } from "../types/wallet";

export const BIRDEYE_BASE_URL = "https://public-api.birdeye.so";

export async function fetchWalletPortfolio(walletAddress: string) {
    try {
        const response = await fetch(
            `${BIRDEYE_BASE_URL}/v1/wallet/token_list?wallet=${walletAddress}`,
            {
                headers: {
                    accept: "application/json",
                    "x-chain": "solana",
                    "X-API-KEY": process.env.BIRDEYE_API_KEY as string,
                },
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return (await response.json()) as WalletPortfolioResponse;
    } catch (error) {
        console.error("Error fetching wallet portfolio:", error);
        throw error;
    }
}
