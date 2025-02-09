import { elizaLogger, IAgentRuntime } from "@elizaos/core";
import bs58 from "bs58";
import { SolanaAgentKit } from "solana-agent-kit";
import { sma } from "technicalindicators";
import { APOLLO_WALLET_ADDRESS } from "./forge/constants";
import {
    ACTIONS_PROMPTS,
    generateRandomThought,
} from "./forge/random-thoughts";
import { createMemory } from "./forge/utils";
import { decrypt } from "./lib/aws-kms";
import { fetchPriceHistory, fetchWalletPortfolio } from "./lib/birdeye";
import { prisma } from "./lib/prisma";

export async function update(runtime: IAgentRuntime, cycle: number) {
    elizaLogger.info(
        `Running auto update cycle #${cycle} for ${runtime.character.name} (${runtime.agentId})`
    );

    // get keys
    const privateKeyBase64 = await decrypt(
        runtime.character.settings.secrets.SOLANA_PRIVATE_KEY
    );

    // Convert base64 to Uint8Array then to base58
    const privateKeyBytes = Buffer.from(privateKeyBase64, "base64");
    const privateKey = bs58.encode(privateKeyBytes);

    const publicKey =
        runtime.character.settings.secrets.SOLANA_WALLET_PUBLIC_KEY;

    const agentId = runtime.character.id;
    elizaLogger.info("AGENT ID: ", agentId);

    elizaLogger.info("PK:", privateKey);

    // Initialize with private key and optional RPC URL
    const agent = new SolanaAgentKit(
        privateKey,
        process.env.SOLANA_RPC_URL,
        process.env.OPENAI_API_KEY
    );

    elizaLogger.info("AGENT KIT ONLINE: ", agent.wallet_address);

    // Create LangChain tools
    // const tools = createSolanaTools(agent);

    // get trading stra I hear a timer 10 more minutes 10 more minutes OKtegy assignments
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
    elizaLogger.info("PORTFOLIO SUCCESS: ", portfolio.success);

    // check out SOL balance
    const solBalance = portfolio.data.items.find(
        (asset) => asset.symbol === "SOL"
    );
    elizaLogger.info("SOL BALANCE: ", solBalance.valueUsd);

    const { priceHistoryResponse, dataUrl } = await fetchPriceHistory({
        tokenAddress: "So11111111111111111111111111111111111111112",
        addressType: "token",
        period: "1H",
    });
    elizaLogger.info("PRICE HISTORY: ", priceHistoryResponse.data.items.length);

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
}
