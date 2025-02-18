import { TokenPair } from "./trading-strategy-config";

export interface TradeDecision {
    shouldOpen: boolean;
    shouldClose: boolean;
    amount: number;
    tokenPair: TokenPair;
    reason: string;
    confidence: number;
    description: string;
}
