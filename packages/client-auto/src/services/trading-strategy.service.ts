import { elizaLogger } from "@elizaos/core";
import { AgentStrategyAssignment } from "@prisma/client";
import { EnumTradeStatus } from "../lib/enums";
import { formatPercent } from "../lib/formatters";
import { prisma } from "../lib/prisma";
import { calculateProximityToThreshold } from "../lib/rsi-utils";
import { TradingStrategyConfig } from "../types/trading-strategy-config";

export class TradingStrategyService {
    private strategyAssignment: AgentStrategyAssignment;
    private strategyConfig: TradingStrategyConfig;

    constructor(strategyAssignment: AgentStrategyAssignment) {
        this.strategyAssignment = strategyAssignment;
        this.strategyConfig =
            strategyAssignment.config as TradingStrategyConfig;
    }

    async evaluatePosition(currentRsi: number) {
        const existingOpenPosition = await this.getOpenPosition();

        const proximityToThreshold = calculateProximityToThreshold(
            currentRsi,
            !!existingOpenPosition,
            this.strategyConfig.rsiConfig.overBought,
            this.strategyConfig.rsiConfig.overSold
        );

        elizaLogger.info(
            "Proximity to next action threshold: ",
            formatPercent(proximityToThreshold / 10000)
        );

        const shouldBuy =
            currentRsi < this.strategyConfig.rsiConfig.overSold &&
            !existingOpenPosition;

        const shouldSell =
            currentRsi > this.strategyConfig.rsiConfig.overBought &&
            existingOpenPosition;

        return {
            shouldBuy,
            shouldSell,
            proximityToThreshold,
            existingOpenPosition,
        };
    }

    calculateTradeAmount(availableAmount: number) {
        return (
            (availableAmount * this.strategyConfig.maxPortfolioAllocation) / 100
        );
    }

    private async getOpenPosition() {
        return await prisma.tradeHistory.findFirst({
            where: {
                status: EnumTradeStatus.OPEN,
                strategyAssignmentId: this.strategyAssignment.id,
            },
        });
    }
}
