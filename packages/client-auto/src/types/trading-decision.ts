import { Position } from "@prisma/client";
import { Token } from "./trading-config";

export interface TradeDecision {
    shouldOpen: boolean;
    shouldClose: boolean;
    amount: number;
    description: string;
    tokenPair: {
        from: Token;
        to: Token;
    };
    strategyAssignmentId: string;
    position?: Position; // Current position if closing
}
