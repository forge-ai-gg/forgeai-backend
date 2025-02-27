import { IAgentRuntime } from "@elizaos/core";
import { AgentStrategyAssignment, AgentTradingStrategy } from "@prisma/client";
import { Connection } from "@solana/web3.js";
import { SolanaAgentKit } from "solana-agent-kit";
import { TradeResult } from "../trading/execute";
import { PortfolioState } from "../trading/portfolio";
import { AllTokenPriceHistory } from "../trading/price-history";
import { ThoughtResponse } from "./thoughts";
import { TradeDecision } from "./trading-decision";
import { TradingStrategyConfig } from "./trading-strategy-config";

export type TransactionResult = {
    decision: TradeDecision;
    transactionHash: string;
    success: boolean;
    error?: Error;
};

// this is all the context that is needed to execute a trading strategy
export interface TradingContext {
    runtime?: IAgentRuntime;
    cycle: number;
    connection?: Connection;
    publicKey: string;
    privateKey: string;
    portfolio?: PortfolioState;
    priceHistory?: AllTokenPriceHistory;
    tradeDecisions?: TradeDecision[];
    agentTradingStrategy: AgentTradingStrategy;
    agentStrategyAssignment: AgentStrategyAssignment;
    tradingStrategyConfig: TradingStrategyConfig;
    solanaAgent: SolanaAgentKit;
    isPaperTrading?: boolean;
    tradeResults?: TradeResult[];
    logMessage?: string;
    thoughtResponse?: ThoughtResponse;
}
