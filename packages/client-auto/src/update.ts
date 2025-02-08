import { IAgentRuntime, elizaLogger } from "@elizaos/core";
import { logRandomThoughts } from "./forge/random-thoughts";
import { fetchWalletPortfolio } from "./lib/birdeye";

export const update = async (runtime: IAgentRuntime) => {
    elizaLogger.info("UPDATE CYCLE STARTING...");

    const agentId = runtime.character.id;
    elizaLogger.info("AGENT ID: ", agentId);

    const privateKey = runtime.character.settings.secrets.SOLANA_PRIVATE_KEY;
    const publicKey =
        runtime.character.settings.secrets.SOLANA_WALLET_PUBLIC_KEY;

    if (privateKey) {
        elizaLogger.info("PRIVATE KEY FOUND: ", privateKey);
    }

    if (publicKey) {
        elizaLogger.info("PUBLIC KEY FOUND: ", publicKey);
    }

    // get portolio balance
    const portfolio = await fetchWalletPortfolio(publicKey);
    elizaLogger.info("PORTFOLIO: ", portfolio);

    // get agent trading strategy
    // const tradingStrategies = await prisma.agentTradingStrategy.findMany();
    // elizaLogger.info("TRADING STRATEGIES: ", tradingStrategies);

    await logRandomThoughts(runtime);
};
