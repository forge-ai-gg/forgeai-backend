import { IAgentRuntime } from "@elizaos/core";
import { PortfolioState } from "../trading/portfolio";
import { TokenPriceHistory } from "../trading/price-history";
import { TradeDecision } from "./trading-decision";

export interface TradingEvent {
    type: "TRADE" | "ANALYSIS" | "ERROR";
    data: {
        priceHistory?: TokenPriceHistory;
        portfolio?: PortfolioState;
        decision?: TradeDecision;
        tx?: string;
        error?: Error;
    };
    timestamp: Date;
    context: Record<string, any>;
}

export interface TradingMemoryParams {
    runtime: IAgentRuntime;
    cycle: number;
    decision: TradeDecision;
    priceHistory: TokenPriceHistory;
    portfolio: PortfolioState;
    tx?: string;
}
