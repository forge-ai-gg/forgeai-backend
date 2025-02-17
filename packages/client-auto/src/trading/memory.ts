import { IAgentRuntime } from "@elizaos/core";
import { generateRandomThought } from "../forge/random-thoughts";
import { createMemory } from "../forge/utils";
import { EnumMemoryType } from "../lib/enums";
import { TradingEvent, TradingMemoryParams } from "../types/trading-event";

export async function recordMemory(params: TradingMemoryParams): Promise<void> {
    const event: TradingEvent = {
        type: params.tx ? "TRADE" : "ANALYSIS",
        data: {
            marketData: params.marketData,
            portfolio: params.portfolio,
            decision: params.decision,
            tx: params.tx,
        },
        timestamp: new Date(),
        context: {
            hasOpenPosition: params.portfolio.hasOpenPosition,
            totalValue: params.portfolio.totalValue,
        },
    };

    const thought = await generateThought(event, params.runtime);
    await saveMemory(thought, params.runtime);
}

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

async function generateThought(
    event: TradingEvent,
    runtime: IAgentRuntime
): Promise<string> {
    const baseAction =
        event.type === "TRADE"
            ? `Executed ${event.data.decision?.type} trade`
            : `Analyzed market conditions`;

    const thought = await generateRandomThought({
        runtime,
        action: baseAction,
        details: event.context,
    });

    return thought.text;
}

async function saveMemory(
    thought: string,
    runtime: IAgentRuntime
): Promise<void> {
    await createMemory({
        runtime,
        message: thought,
        additionalContent: {
            type: EnumMemoryType.TRADE,
        },
    });
}
