import { IAgentRuntime } from "@elizaos/core";
import { AgentStrategyAssignment, AgentTradingStrategy } from "@prisma/client";
import { Connection } from "@solana/web3.js";
import { PortfolioState } from "../trading/portfolio";
import { TokenPairPriceHistory } from "../trading/price-history";
import { TradeDecision } from "./trading-decision";
import { TradingStrategyConfig } from "./trading-strategy-config";

// this is all the context that is needed to execute a trading strategy
export type TradingContext = {
    runtime: IAgentRuntime;
    cycle: number;
    connection: Connection;
    publicKey: string;
    privateKey: string;
    portfolio?: PortfolioState;
    priceHistory?: TokenPairPriceHistory[];
    tradeDecisions?: TradeDecision[];
    agentTradingStrategy: AgentTradingStrategy;
    agentStrategyAssignment: AgentStrategyAssignment;
    tradingStrategyConfig: TradingStrategyConfig;
};
