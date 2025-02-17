export interface TradeDecision {
    shouldTrade: boolean;
    type: "OPEN" | "CLOSE";
    amount: number;
    token: {
        from: string;
        to: string;
    };
    reason: string;
    confidence: number;
    description: string;
}
