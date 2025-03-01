import { elizaLogger, IAgentRuntime } from "@elizaos/core";
import { SolanaAgentKit } from "solana-agent-kit";
import { config } from "../lib/config";
import { FORCE_PAPER_TRADING } from "../lib/constants";
import { getAgentWalletDetails } from "../lib/get-character-details";
import { prisma } from "../lib/prisma";
import { TradingContext } from "../types/trading-context";
import { TradingStrategyConfig } from "../types/trading-strategy-config";

export async function initializeTradingContext({
    runtime,
    cycle,
}: {
    runtime: IAgentRuntime;
    cycle: number;
}): Promise<TradingContext> {
    try {
        const { privateKey, publicKey } = await getAgentWalletDetails({
            runtime,
            cycle,
        });

        // Get the active trading strategy assignment
        const agentStrategyAssignment =
            await prisma.agentStrategyAssignment.findFirstOrThrow({
                where: {
                    agentId: runtime.character.id,
                    isActive: true,
                },
                include: {
                    AgentTradingStrategy: true,
                },
            });

        // parse out the agent trading strategy and trading strategy config
        const agentTradingStrategy =
            agentStrategyAssignment.AgentTradingStrategy;
        const tradingStrategyConfig =
            agentStrategyAssignment.config as TradingStrategyConfig;

        // Remove the AgentTradingStrategy from the assignment object to match test expectations
        const { AgentTradingStrategy, ...cleanedAssignment } =
            agentStrategyAssignment;

        const solanaAgent = new SolanaAgentKit(
            privateKey,
            config.SOLANA_RPC_URL.replace("{chain_id}", config.SOLANA_CHAIN_ID),
            {
                OPENAI_API_KEY: config.OPENAI_API_KEY,
            }
        );

        // When creating context, mark non-serializable properties
        const ctx: TradingContext = {
            runtime,
            cycle,
            agentTradingStrategy,
            agentStrategyAssignment: cleanedAssignment,
            tradingStrategyConfig,
            privateKey,
            publicKey,
            solanaAgent,
            // handle the case where the trading strategy is a paper trading strategy
            isPaperTrading:
                cleanedAssignment.isPaperTrading || FORCE_PAPER_TRADING,
        };

        return ctx;
    } catch (error) {
        elizaLogger.error(
            `Error initializing trading context: ${error}`,
            error
        );
        throw error;
    }
}
