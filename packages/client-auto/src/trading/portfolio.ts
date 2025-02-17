import { Position } from "@prisma/client";
import { EnumPositionStatus } from "../lib/enums";
import { prisma } from "../lib/prisma";

import { WalletPortfolioItem } from "../types/birdeye/api/wallet";
import { getWalletPortfolio } from "./solana";

export type PortfolioState = {
    openPositions: Position[];
    walletPortfolioItems: WalletPortfolioItem[];
    totalValue: number;
};

export async function getPortfolio({
    agentStrategyAssignmentId,
    publicKey,
}: {
    agentStrategyAssignmentId: string;
    publicKey: string;
}): Promise<PortfolioState> {
    const [openPositions, walletPortfolioResponse] = await Promise.all([
        getOpenPositionsByAssignmentId(agentStrategyAssignmentId),
        getWalletPortfolio(publicKey),
    ]);

    const totalValue = walletPortfolioResponse.data.items.reduce(
        (sum, bal) => sum + bal.valueUsd,
        0
    );

    const walletPortfolioItems = walletPortfolioResponse.data.items;

    return {
        openPositions,
        walletPortfolioItems,
        totalValue,
    };
}

async function getOpenPositionsByAssignmentId(
    strategyAssignmentId: string
): Promise<Position[]> {
    return await prisma.position.findMany({
        where: {
            strategyAssignmentId,
            status: EnumPositionStatus.OPEN,
        },
    });
}
