import { IAgentRuntime } from "@elizaos/core";
import {
    BirdeyeProvider,
    WalletPortfolioResponse,
} from "@elizaos/plugin-birdeye";
import { CHAIN_ID } from "./constants";

export const getWalletPortfolio = async (
    runtime: IAgentRuntime,
    walletAddress: string
): Promise<WalletPortfolioResponse> => {
    const provider = new BirdeyeProvider(runtime.cacheManager);
    const response: WalletPortfolioResponse =
        await provider.fetchWalletPortfolio(
            {
                wallet: walletAddress,
            },
            {
                headers: {
                    chain: CHAIN_ID,
                },
            }
        );

    if (!response) {
        throw new Error("No result found");
    }

    return response;
};

export const getTokenOverview = async (
    runtime: IAgentRuntime,
    address: string
) => {
    const provider = new BirdeyeProvider(runtime.cacheManager);
    const response = await provider.fetchTokenOverview(
        {
            address,
        },
        {
            headers: {
                chain: CHAIN_ID,
            },
        }
    );
    return response;
};

export const getMetadata = async (runtime: IAgentRuntime, address: string) => {
    const provider = new BirdeyeProvider(runtime.cacheManager);
    const response = await provider.fetchTokenMetadataSingle(
        {
            address,
        },
        {
            headers: {
                chain: CHAIN_ID,
            },
        }
    );
    return response;
};

export const getTokenSecurity = async (
    runtime: IAgentRuntime,
    address: string
) => {
    const provider = new BirdeyeProvider(runtime.cacheManager);
    const response = await provider.fetchTokenSecurityByAddress(
        {
            address,
        },
        {
            headers: {
                chain: CHAIN_ID,
            },
        }
    );
    return response;
};

export const getTokenTradeData = async (
    runtime: IAgentRuntime,
    address: string
) => {
    const provider = new BirdeyeProvider(runtime.cacheManager);
    const response = await provider.fetchTokenTradeDataSingle(
        {
            address,
        },
        {
            headers: {
                chain: CHAIN_ID,
            },
        }
    );
    return response;
};

export const getTrendingTokens = async (
    runtime: IAgentRuntime,
    offset: number = 0,
    limit: number = 20
) => {
    const provider = new BirdeyeProvider(runtime.cacheManager);
    const response = await provider.fetchTokenTrending(
        {
            sort_by: "volume24hUSD",
            sort_type: "desc",
            offset,
            limit,
        },
        {
            headers: {
                chain: CHAIN_ID,
            },
        }
    );
    return response;
};
