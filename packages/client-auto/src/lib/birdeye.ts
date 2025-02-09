import { elizaLogger } from "@elizaos/core";
import { DefiHistoryPriceResponse } from "../types/birdeye/api/defi";
import { WalletPortfolioResponse } from "../types/birdeye/api/wallet";
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

export async function fetchPriceHistory({
    tokenAddress,
    addressType,
    period,
    timeFrom,
    timeTo,
}: {
    tokenAddress: string;
    addressType: "token" | "pair";
    period:
        | "1m"
        | "3m"
        | "5m"
        | "15m"
        | "30m"
        | "1H"
        | "2H"
        | "4H"
        | "6H"
        | "8H"
        | "12H"
        | "1D"
        | "3D"
        | "1W"
        | "1M";
    timeFrom?: number;
    timeTo?: number;
}) {
    // default to 1 day ago
    const time_from =
        timeFrom ||
        Math.floor((new Date().getTime() - 1000 * 60 * 60 * 24) / 1000);
    const time_to = timeTo || Math.floor(new Date().getTime() / 1000);

    try {
        const dataUrl = `${BIRDEYE_BASE_URL}/defi/history_price?address=${tokenAddress}&address_type=${addressType}&type=${period}&time_from=${time_from}&time_to=${time_to}`;
        elizaLogger.info("Fetching price history from:", dataUrl);
        const response = await fetch(dataUrl, {
            headers: {
                accept: "application/json",
                "x-chain": "solana",
                "X-API-KEY": process.env.BIRDEYE_API_KEY as string,
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const priceHistoryResponse: DefiHistoryPriceResponse =
            await response.json();
        // elizaLogger.info("Price history:", priceHistoryResponse);

        return {
            priceHistoryResponse,
            dataUrl,
        };
    } catch (error) {
        console.error("Error fetching price history:", error);
        throw error;
    }
}
