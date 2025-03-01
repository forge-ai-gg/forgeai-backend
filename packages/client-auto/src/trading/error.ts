import { elizaLogger, IAgentRuntime } from "@elizaos/core";
import { recordError } from "./memory";

/**
 * Handle general trading errors
 * Logs and records errors that occur during the trading cycle
 */
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

/**
 * Handle trade execution errors
 * Centralizes error handling for trade execution
 */
export async function handleTradeError(params: {
    error: Error;
    decision?: any;
    context?: string;
}) {
    const { error, decision, context } = params;

    elizaLogger.error(`Trade error in ${context || "unknown context"}:`, error);

    // Return standardized error result
    return {
        success: false,
        error,
        errorContext: context,
        affectedDecision: decision,
    };
}

/**
 * Create a standardized error response for trading operations
 */
export function createErrorResponse(error: Error, context: string) {
    return {
        success: false,
        error,
        errorContext: context,
    };
}
