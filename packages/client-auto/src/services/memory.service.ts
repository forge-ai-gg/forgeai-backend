import { IAgentRuntime } from "@elizaos/core";
import { APOLLO_WALLET_ADDRESS } from "../forge/constants";
import {
    ACTIONS_PROMPTS,
    generateRandomThought,
    generateRandomThought as generateTradingThought,
} from "../forge/random-thoughts";
import { createMemory } from "../forge/utils";
import { priceHistoryUrl } from "../lib/birdeye";
import { EnumMemoryType } from "../lib/enums";
import { TimeInterval } from "../types/birdeye/api/common";

export class MemoryService {
    constructor(private runtime: IAgentRuntime) {}

    async createTradeMemory(params: {
        message: string;
        tokenAddress: string;
        timeInterval: TimeInterval;
        currentRsi: number;
        overBought: number;
        overSold: number;
        proximityToThreshold: number;
        tx: string;
        tradeHistory: any;
    }) {
        return await createMemory({
            runtime: this.runtime,
            message: params.message,
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
            },
        });
    }

    async createIdleMemory(params: {
        tokenAddress: string;
        timeInterval: TimeInterval;
        proximityToThreshold: number;
    }) {
        const randomThought = await generateRandomThought({
            runtime: this.runtime,
            action: ACTIONS_PROMPTS[
                Math.floor(Math.random() * ACTIONS_PROMPTS.length)
            ],
            details: {
                walletAddress: APOLLO_WALLET_ADDRESS,
            },
        });

        return {
            thought: randomThought,
            memory: await createMemory({
                runtime: this.runtime,
                message: randomThought.text,
                additionalContent: {
                    dataUrl: this.generatePriceHistoryUrl(
                        params.tokenAddress,
                        params.timeInterval
                    ),
                    proximityToThreshold: params.proximityToThreshold,
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
