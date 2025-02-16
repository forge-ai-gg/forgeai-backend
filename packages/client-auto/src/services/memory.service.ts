import { elizaLogger, IAgentRuntime } from "@elizaos/core";
import {
    generateRandomThought,
    generateRandomThought as generateTradingThought,
} from "../forge/random-thoughts";
import { createMemory } from "../forge/utils";
import { priceHistoryUrl } from "../lib/birdeye";
import { EnumMemoryType } from "../lib/enums";
import { TimeInterval } from "../types/birdeye/api/common";

interface CreateTradeMemoryParams {
    message: string;
    tokenAddress: string;
    timeInterval: TimeInterval;
    currentRsi: number;
    overBought: number;
    overSold: number;
    proximityToThreshold: number;
    tx: string;
    tradeHistory: any;
    memoryText: string;
    memoryContext: Record<string, any>;
}

interface CreateIdleMemoryParams {
    tokenAddress: string;
    timeInterval: TimeInterval;
    proximityToThreshold: number;
    memoryText: string;
    memoryContext: Record<string, any>;
}

export class MemoryService {
    constructor(private runtime: IAgentRuntime) {}

    async createTradeMemory(params: CreateTradeMemoryParams) {
        const baseAction = `Executing ${params.memoryText}`;
        const coloredThought = await generateTradingThought({
            runtime: this.runtime,
            action: baseAction,
            details: {
                context: params.memoryContext,
            },
        });

        return await createMemory({
            runtime: this.runtime,
            message: coloredThought.text,
            additionalContent: {
                type: EnumMemoryType.TRADE,
                dataUrl: this.generatePriceHistoryUrl(
                    params.tokenAddress,
                    params.timeInterval
                ),
                currentRsi: params.currentRsi,
                overBought: params.overBought,
                overSold: params.overSold,
                proximityToThreshold: params.proximityToThreshold,
                tx: params.tx,
                tradeHistory: params.tradeHistory,
                context: params.memoryContext,
                originalAnalysis: params.memoryText,
            },
        });
    }

    async createIdleMemory(params: CreateIdleMemoryParams) {
        // const actionPrompt =
        //     ACTIONS_PROMPTS[Math.floor(Math.random() * ACTIONS_PROMPTS.length)];

        const baseAction = `You analyzed the market and observed: ${params.memoryText}`;
        const thought = await generateRandomThought({
            runtime: this.runtime,
            action: baseAction,
        });

        elizaLogger.info("thought:", thought);

        return {
            thought,
            memory: await createMemory({
                runtime: this.runtime,
                message: thought.text,
                additionalContent: {
                    dataUrl: this.generatePriceHistoryUrl(
                        params.tokenAddress,
                        params.timeInterval
                    ),
                    proximityToThreshold: params.proximityToThreshold,
                    context: params.memoryContext,
                    originalAnalysis: params.memoryText,
                },
            }),
        };
    }

    async generateTradingThought(params: {
        amountToTrade: number;
        shouldBuy: boolean;
        tokenFromSymbol: string;
        tokenToSymbol: string;
        walletAddress: string;
    }) {
        return await generateTradingThought({
            runtime: this.runtime,
            action: `Swapping ${params.amountToTrade} ${
                params.shouldBuy ? params.tokenFromSymbol : params.tokenToSymbol
            } to ${
                params.shouldBuy ? params.tokenToSymbol : params.tokenFromSymbol
            }`,
            details: {
                walletAddress: params.walletAddress,
            },
        });
    }

    private generatePriceHistoryUrl(
        tokenAddress: string,
        timeInterval: TimeInterval
    ) {
        return priceHistoryUrl(
            tokenAddress,
            "token",
            timeInterval,
            Math.floor((new Date().getTime() - 1000 * 100) / 1000),
            Math.floor(new Date().getTime() / 1000)
        );
    }
}
