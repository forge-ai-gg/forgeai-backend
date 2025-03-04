import { Position } from "@prisma/client";
import { TokenWithPrice } from "./trading-config";

export interface TradeDecision {
    shouldOpen: boolean;
    shouldClose: boolean;
    amount: number;
    description: string;
    tokenPair: {
        from: TokenWithPrice;
        to: TokenWithPrice;
    };
    strategyAssignmentId: string;
    position?: Position; // Current position if closing
}
