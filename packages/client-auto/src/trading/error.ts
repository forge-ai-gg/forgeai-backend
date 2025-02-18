import { elizaLogger, IAgentRuntime } from "@elizaos/core";
import { recordError } from "./memory";

export async function handleError(params: {
    runtime: IAgentRuntime;
    cycle: number;
    error: Error;
}): Promise<void> {
    // Add more context to error logging
    const errorContext = {
        cycle: params.cycle,
        message: params.error.message,
        stack: params.error.stack,
        // Capture the error object for additional properties
        errorObj: JSON.stringify(
            params.error,
            Object.getOwnPropertyNames(params.error)
        ),
    };

    elizaLogger.error(
        `Trading cycle error (${params.cycle}): ${params.error.message}\n${
            params.error.stack
        }\nContext: ${JSON.stringify(errorContext, null, 2)}`
    );

    await recordError(params);
}
