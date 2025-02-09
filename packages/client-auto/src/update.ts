import { IAgentRuntime, elizaLogger } from "@elizaos/core";
import { sma } from "technicalindicators";
import { APOLLO_WALLET_ADDRESS } from "./forge/constants";
import {
    ACTIONS_PROMPTS,
    generateRandomThought,
} from "./forge/random-thoughts";
import { createMemory } from "./forge/utils";
import { fetchPriceHistory, fetchWalletPortfolio } from "./lib/birdeye";
import { prisma } from "./lib/prisma";

export const update = async (runtime: IAgentRuntime) => {
    elizaLogger.info("UPDATE CYCLE STARTING...");

    const agentId = runtime.character.id;
    elizaLogger.info("AGENT ID: ", agentId);

    // get keys
    const privateKey = runtime.character.settings.secrets.SOLANA_PRIVATE_KEY;
    const publicKey =
        runtime.character.settings.secrets.SOLANA_WALLET_PUBLIC_KEY;

    // get trading strategy assignments
    const tradingStrategyAssignments =
        await prisma.agentStrategyAssignment.findMany({
            where: {
                agentId: agentId,
            },
            include: {
                AgentTradingStrategy: true,
            },
        });
    elizaLogger.info(
        "TRADING STRATEGY: ",
        tradingStrategyAssignments[0].AgentTradingStrategy.title
    );

    // get portolio balance
    const portfolio = await fetchWalletPortfolio(publicKey);
    elizaLogger.info("PORTFOLIO: ", portfolio);

    // check out SOL balance
    const solBalance = portfolio.data.items.find(
        (asset) => asset.symbol === "SOL"
    );
    elizaLogger.info("SOL BALANCE: ", solBalance);

    const { priceHistoryResponse, dataUrl } = await fetchPriceHistory({
        tokenAddress: "So11111111111111111111111111111111111111112",
        addressType: "token",
        period: "1H",
    });
    elizaLogger.info(
        "PRICE HISTORY: ",
        priceHistoryResponse.data.items.slice(0, 3)
    );

    // get sma
    const period = 10;
    const simpleMovingAverage = sma({
        period,
        values: priceHistoryResponse.data.items.map((item) => item.value),
    });
    // elizaLogger.info("SMA: ", simpleMovingAverage);

    const randomThought = await generateRandomThought(
        runtime,
        ACTIONS_PROMPTS[Math.floor(Math.random() * ACTIONS_PROMPTS.length)],
        {
            walletAddress: APOLLO_WALLET_ADDRESS,
        }
    );

    elizaLogger.info("randomThought:", {
        text: randomThought.text,
        tokenUsage: randomThought.tokenUsage,
    });

    // generate a thought about what to do
    await createMemory({
        runtime,
        message: randomThought.text,
        additionalContent: {
            dataUrl,
        },
    });
};
