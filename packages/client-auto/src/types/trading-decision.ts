export interface TradeDecision {
    shouldOpen: boolean;
    shouldClose: boolean;
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
