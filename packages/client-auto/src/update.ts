import { elizaLogger, IAgentRuntime } from "@elizaos/core";
import { buildTradingContextLogMessage } from "./lib/logging";
import { handleError } from "./trading/error";
import {
    evaluateTradeDecisions,
    executeTradeDecisions,
} from "./trading/execute";
import { recordMemory } from "./trading/memory";
import { getPortfolio } from "./trading/portfolio";
import { getPriceHistory } from "./trading/price-history";
import { initializeTradingContext } from "./types/trading-context";

export async function update(runtime: IAgentRuntime, cycle: number) {
    try {
        // 1. Initialize context. This includes getting character details like the public key, private key, trading strategy, and trading strategy assignment.
        const ctx = await initializeTradingContext({ runtime, cycle });
        elizaLogger.info(`Got wallet details...`);

        // 2. Get and log portfolio state
        ctx.portfolio = await getPortfolio({
            agentStrategyAssignmentId: ctx.agentStrategyAssignment.id,
            publicKey: ctx.publicKey,
        });
        elizaLogger.info(`Got portfolio...`);

        // 3. Get price history data for all trading pairs in the trading strategy config
        ctx.priceHistory = await getPriceHistory(ctx.tradingStrategyConfig);
        elizaLogger.info(`Got price history...`);

        // 4. Evaluate trading decisions with branching logic based on the trading strategy
        ctx.tradeDecisions = await evaluateTradeDecisions(ctx);
        elizaLogger.info(`Evaluated trade decisions...`);

        // 5. Execute trades and capture results
        ctx.transactions = await executeTradeDecisions(ctx);
        elizaLogger.info(`Executed trades...`);

        // record the log message up to this point to be used by the agent when logging its memory to talk about what it did
        ctx.logMessage = buildTradingContextLogMessage(ctx);

        // 6. Record a single consolidated memory for this update cycle
        ctx.memory = await recordMemory(ctx);
        elizaLogger.info(`Recorded memory...`);

        // 7. Log the log message
        ctx.logMessage = buildTradingContextLogMessage(ctx);
        elizaLogger.info(ctx.logMessage);
    } catch (error) {
        await handleError({ runtime, cycle, error });
    }
}
