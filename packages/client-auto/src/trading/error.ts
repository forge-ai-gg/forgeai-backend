import { elizaLogger, IAgentRuntime } from "@elizaos/core";
import { recordError } from "./memory";

export async function handleError(params: {
    runtime: IAgentRuntime;
    cycle: number;
    error: Error;
}): Promise<void> {
    elizaLogger.error(
        `Trading cycle error (${params.cycle}): ${params.error.message}`
    );

    await recordError(params);
}
