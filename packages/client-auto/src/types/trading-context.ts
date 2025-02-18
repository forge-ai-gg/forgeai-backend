import { elizaLogger, IAgentRuntime } from "@elizaos/core";
import { AgentStrategyAssignment, AgentTradingStrategy } from "@prisma/client";
import { Connection } from "@solana/web3.js";
import { SolanaAgentKit } from "solana-agent-kit";
import { config } from "../lib/config";
import { getAgentWalletDetails } from "../lib/get-character-details";
import { prisma } from "../lib/prisma";
import { ExecutionResult } from "../trading/execute";
import { PortfolioState } from "../trading/portfolio";
import { TokenPairPriceHistory } from "../trading/price-history";
import { TradeDecision } from "./trading-decision";
import { TradingStrategyConfig } from "./trading-strategy-config";

// this is all the context that is needed to execute a trading strategy
export type TransactionResult = {
    decision: TradeDecision;
    transactionHash: string;
    success: boolean;
    error?: Error;
};

export interface TradingContext {
    runtime?: IAgentRuntime;
    cycle: number;
    connection?: Connection;
    publicKey: string;
    privateKey: string;
    portfolio?: PortfolioState;
    priceHistory?: TokenPairPriceHistory[];
    tradeDecisions?: TradeDecision[];
    agentTradingStrategy: AgentTradingStrategy;
    agentStrategyAssignment: AgentStrategyAssignment;
    tradingStrategyConfig: TradingStrategyConfig;
    solanaAgent: SolanaAgentKit;
    isPaperTrading?: boolean;
    transactions?: ExecutionResult[];
    memory?: string;
    logMessage?: string;
}

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

        // Create a connection to the Solana blockchain
        const connection = new Connection(config.SOLANA_RPC_URL!, "confirmed");

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

        // set up sak

        const solanaAgent = new SolanaAgentKit(
            privateKey,
            config.SOLANA_RPC_URL,
            {
                OPENAI_API_KEY: config.OPENAI_API_KEY,
            }
        );

        // When creating context, mark non-serializable properties
        const ctx: TradingContext = {
            runtime,
            cycle,
            connection,
            agentTradingStrategy,
            agentStrategyAssignment,
            tradingStrategyConfig,
            privateKey,
            publicKey,
            solanaAgent,
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
