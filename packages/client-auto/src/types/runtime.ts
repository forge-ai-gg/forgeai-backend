import { IAgentRuntime as BaseAgentRuntime } from "@elizaos/core";

export interface IAgentRuntime extends BaseAgentRuntime {
    getTradingStrategy(): Promise<{
        id: string;
        class: string;
        config: Record<string, any>;
        pairs: Array<{
            from: Token;
            to: Token;
        }>;
        interval: TimeInterval;
        isPaperTrading: boolean;
    }>;
}
