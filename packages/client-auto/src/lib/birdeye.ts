import { TimeInterval } from "../types/birdeye/api/common";
import { DefiHistoryPriceResponse } from "../types/birdeye/api/defi";
import { WalletPortfolioResponse } from "../types/birdeye/api/wallet";
import { config } from "./config";
export const BIRDEYE_BASE_URL = "https://public-api.birdeye.so";

// get the wallet portfolio for a wallet address
export const fetchWalletPortfolio = async (walletAddress: string) => {
    try {
        const response = await fetch(
            `${BIRDEYE_BASE_URL}/v1/wallet/token_list?wallet=${walletAddress}`,
            {
                headers: {
                    accept: "application/json",
                    "x-chain": "solana",
                    "X-API-KEY": config.BIRDEYE_API_KEY as string,
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
};

// get the price history for a token
export const fetchPriceHistory = async (url: string) => {
    try {
        const response = await fetch(url, {
            headers: {
                accept: "application/json",
                "x-chain": "solana",
                "X-API-KEY": config.BIRDEYE_API_KEY as string,
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return (await response.json()) as DefiHistoryPriceResponse;
    } catch (error) {
        console.error("Error fetching price history:", error);
        throw error;
    }
};

// get the price history url
export const priceHistoryUrl = (
    tokenAddress: string,
    addressType: "token" | "pair",
    period: TimeInterval,
    timeFrom?: number,
    timeTo?: number
) => {
    const time_from =
        timeFrom ||
        Math.floor((new Date().getTime() - 1000 * 60 * 60 * 24) / 1000);
    const time_to = timeTo || Math.floor(new Date().getTime() / 1000);
    return `${BIRDEYE_BASE_URL}/defi/history_price?address=${tokenAddress}&address_type=${addressType}&type=${period}&time_from=${time_from}&time_to=${time_to}`;
};
