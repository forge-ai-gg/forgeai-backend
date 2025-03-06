import { generateRandomThought } from "@/forge/random-thoughts";
import { generateTradingThought } from "@/forge/trading-thought";
import { createMemory } from "@/forge/utils";
import { EnumMemoryType } from "@/lib/enums";
import { ThoughtResponse } from "@/types/thoughts";
import { TradingEvent } from "@/types/trading-event";
import { IAgentRuntime } from "@elizaos/core";
import { evaluateStrategy } from "../trading/strategy";
import { TradingContext } from "../types/trading-context";

export async function recordMemory(
    ctx: TradingContext
): Promise<ThoughtResponse> {
    // Now use the cleaned context
    if (ctx.tradeResults?.length) {
        return await createTradeMemory(ctx);
    }

    return await createIdleMemory(ctx);
}

export const createTradeMemory = async (
    ctx: TradingContext
): Promise<ThoughtResponse> => {
    const action = `You analyzed the market and observed: ${ctx.logMessage}`;
    const thought = await generateTradingThought({
        runtime: ctx.runtime,
        action,
        details: ctx.logMessage,
    });

    await createMemory({
        runtime: ctx.runtime,
        message: thought.text,
        additionalContent: {
            type: EnumMemoryType.TRADE,
            logMessage: ctx.logMessage,
            transactions: ctx.tradeResults?.map((tradeResult) => ({
                ...tradeResult.transaction,
                success: tradeResult.success,
                error: tradeResult.error,
            })),
        },
    });

    return thought;
};

export const createIdleMemory = async (
    ctx: TradingContext
): Promise<ThoughtResponse> => {
    const action = `You analyzed the market and observed: ${ctx.logMessage}`;
    const thought = await generateRandomThought({
        runtime: ctx.runtime,
        action,
        details: ctx.logMessage,
    });

    // Calculate the maximum proximity from all token pairs (considering both open and close)
    const proximityValues = ctx.tradingStrategyConfig.tokenPairs.flatMap(
        (pair, index) => {
            const result = evaluateStrategy({ ctx, pair, index, amount: 0 });
            return [result.openProximity, result.closeProximity];
        }
    );

    const maxProximity = proximityValues.reduce(
        (max, current) => Math.max(max, current),
        0
    );

    await createMemory({
        runtime: ctx.runtime,
        message: thought.text,
        additionalContent: {
            type: EnumMemoryType.IDLE,
            logMessage: ctx.logMessage,
            proximity: maxProximity,
        },
    });

    return thought;
};

export async function recordError(params: {
    runtime: IAgentRuntime;
    error: Error;
    cycle: number;
}): Promise<void> {
    const event: TradingEvent = {
        type: "ERROR",
        data: { error: params.error },
        timestamp: new Date(),
        context: {
            cycle: params.cycle,
            errorMessage: params.error.message,
            stack: params.error.stack,
        },
    };

    await createMemory({
        runtime: params.runtime,
        message: `Trading error: ${params.error.message}`,
        additionalContent: {
            type: EnumMemoryType.ERROR,
            error: params.error,
            context: event.context,
        },
    });
}
