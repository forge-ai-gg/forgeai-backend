import { IAgentRuntime } from "@elizaos/core";
import { generateRandomThought } from "../forge/random-thoughts";
import { generateTradingThought } from "../forge/trading-thought";
import { createMemory } from "../forge/utils";
import { EnumMemoryType } from "../lib/enums";
import { TradingContext } from "../types/trading-context";
import { TradingEvent } from "../types/trading-event";

export async function recordMemory(ctx: TradingContext): Promise<string> {
    // Now use the cleaned context
    if (ctx.transactions?.length) {
        return await createTradeMemory(ctx);
    }

    return await createIdleMemory(ctx);
}

export const createTradeMemory = async (
    ctx: TradingContext
): Promise<string> => {
    const action = `You analyzed the market and observed: ${ctx.logMessage}`;
    const thought = await generateTradingThought({
        runtime: ctx.runtime,
        action,
        details: ctx.logMessage,
    });

    await createMemory({
        runtime: ctx.runtime,
        message: thought,
        additionalContent: {
            type: EnumMemoryType.TRADE,
            logMessage: ctx.logMessage,
            transactions: ctx.transactions,
            portfolio: ctx.portfolio,
        },
    });

    return thought;
};

export const createIdleMemory = async (
    ctx: TradingContext
): Promise<string> => {
    const action = `You analyzed the market and observed: ${ctx.logMessage}`;
    const thought = await generateRandomThought({
        runtime: ctx.runtime,
        action,
        details: ctx.logMessage,
    });

    await createMemory({
        runtime: ctx.runtime,
        message: thought.text,
        additionalContent: {
            type: EnumMemoryType.IDLE,
            context: {
                type: "idle",
                logMessage: ctx.logMessage,
            },
        },
    });

    return thought.text;
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
