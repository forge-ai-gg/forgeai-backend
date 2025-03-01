import { elizaLogger, IAgentRuntime } from "@elizaos/core";
import { buildTradingContextLogMessage } from "./lib/logging";
import { initializeTradingContext } from "./trading/context";
import { handleError } from "./trading/error";
import { evaluateTradeDecisions } from "./trading/evaluate";
import { executeTradeDecisions } from "./trading/execute";
import { recordMemory } from "./trading/memory";
import { getPortfolio } from "./trading/portfolio";
import { getPriceHistory } from "./trading/price-history";
import { TradingContext } from "./types/trading-context";

/**
 * Main update function that executes the trading workflow
 *
 * This function follows a test-driven development approach where each step
 * is independently testable and has corresponding unit tests in __tests__/trading-steps.test.ts
 *
 * The trading workflow follows a specific sequence:
 * 1. Initialize trading context
 * 2. Get portfolio data
 * 3. Get price history
 * 4. Evaluate trade decisions
 * 5. Execute trade decisions
 * 6. Build log message
 * 7. Record memory
 * 8. Log results
 *
 * Each step is designed to be independently testable with clear inputs and outputs,
 * allowing for comprehensive test coverage of edge cases.
 */
export async function update(runtime: IAgentRuntime, cycle: number) {
    try {
        // 1. Initialize context with wallet details and configuration
        const ctx = await initializeTradingContext({ runtime, cycle });
        elizaLogger.info(`Trading context initialized with wallet details`);

        // 2. Execute all trading steps in sequence
        const updatedCtx = await executeSteps(ctx, [
            tradingSteps.getPortfolio,
            tradingSteps.getPriceHistory,
            tradingSteps.evaluateTradeDecisions,
            tradingSteps.executeTradeDecisions,
            tradingSteps.buildLogMessage,
            tradingSteps.recordMemory,
            tradingSteps.logResults,
        ]);

        return updatedCtx;
    } catch (error) {
        await handleError({ runtime, cycle, error });
    }
}

// Define a type for each step in the trading process
export type TradingStep = (ctx: TradingContext) => Promise<TradingContext>;

/**
 * Trading steps definition
 *
 * Each step is independently testable and follows the same pattern:
 * 1. Takes a TradingContext as input
 * 2. Performs a specific operation
 * 3. Returns an updated TradingContext
 *
 * This design enables comprehensive unit testing of each step in isolation,
 * as well as integration testing of multiple steps together.
 */
export const tradingSteps: Record<string, TradingStep> = {
    /**
     * Step 1: Get portfolio data
     *
     * Retrieves current wallet holdings and open positions
     * Tests should verify correct handling of:
     * - Empty wallets
     * - Multiple token holdings
     * - Various open positions
     * - API failures
     */
    getPortfolio: async (ctx: TradingContext): Promise<TradingContext> => {
        ctx.portfolio = await getPortfolio({
            agentStrategyAssignmentId: ctx.agentStrategyAssignment.id,
            publicKey: ctx.publicKey,
        });
        elizaLogger.info(`Portfolio data retrieved successfully`);
        return ctx;
    },

    /**
     * Step 2: Get price history
     *
     * Retrieves historical price data for tokens in the trading strategy
     * Tests should verify correct handling of:
     * - Various time periods
     * - Missing price data
     * - API failures
     * - Data format validation
     */
    getPriceHistory: async (ctx: TradingContext): Promise<TradingContext> => {
        ctx.priceHistory = await getPriceHistory(ctx.tradingStrategyConfig);
        elizaLogger.info(`Price history data retrieved successfully`);
        return ctx;
    },

    /**
     * Step 3: Evaluate trade decisions
     *
     * Analyzes market data and generates trade signals
     * Tests should verify correct handling of:
     * - Various strategy types
     * - Buy/sell signals
     * - Position sizing
     * - Risk management rules
     * - Edge cases in technical indicators
     */
    evaluateTradeDecisions: async (
        ctx: TradingContext
    ): Promise<TradingContext> => {
        ctx.tradeDecisions = await evaluateTradeDecisions(ctx);
        elizaLogger.info(
            `Trade decisions evaluated: ${
                ctx.tradeDecisions?.length || 0
            } signals generated`
        );
        return ctx;
    },

    /**
     * Step 4: Execute trade decisions
     *
     * Executes trades based on the decisions from the previous step
     * Tests should verify correct handling of:
     * - Transaction success/failure
     * - Slippage protection
     * - Retry mechanisms
     * - Error handling
     * - Position tracking
     */
    executeTradeDecisions: async (
        ctx: TradingContext
    ): Promise<TradingContext> => {
        ctx.tradeResults = await executeTradeDecisions(ctx);
        elizaLogger.info(
            `Trade execution completed: ${
                ctx.tradeResults?.filter((r) => r.success).length || 0
            }/${ctx.tradeResults?.length || 0} successful`
        );
        return ctx;
    },

    /**
     * Step 5: Build log message
     *
     * Creates a structured log message summarizing the trading cycle
     * Tests should verify correct handling of:
     * - Complete trading context
     * - Partial context (missing fields)
     * - Various trade outcomes
     */
    buildLogMessage: async (ctx: TradingContext): Promise<TradingContext> => {
        ctx.logMessage = buildTradingContextLogMessage(ctx);
        return ctx;
    },

    /**
     * Step 6: Record memory
     *
     * Stores trading context for future reference and analysis
     * Tests should verify correct handling of:
     * - Memory persistence
     * - Data integrity
     * - Error handling
     */
    recordMemory: async (ctx: TradingContext): Promise<TradingContext> => {
        ctx.thoughtResponse = await recordMemory(ctx);
        elizaLogger.info(`Trading memory recorded successfully`);
        return ctx;
    },

    /**
     * Step 7: Log results
     *
     * Outputs the final trading context log message
     * Tests should verify correct handling of:
     * - Log formatting
     * - Complete data inclusion
     */
    logResults: async (ctx: TradingContext): Promise<TradingContext> => {
        // Update the log message with the final state
        ctx.logMessage = buildTradingContextLogMessage(ctx);
        elizaLogger.info(ctx.logMessage);
        return ctx;
    },
};

/**
 * Execute a sequence of trading steps
 *
 * This function takes an initial trading context and a sequence of steps,
 * then executes each step in order, passing the updated context to each subsequent step.
 *
 * Tests should verify:
 * - Proper sequencing of steps
 * - Context propagation between steps
 * - Error handling and recovery
 * - Complete workflow execution
 */
async function executeSteps(
    initialCtx: TradingContext,
    steps: TradingStep[]
): Promise<TradingContext> {
    let ctx = initialCtx;

    for (const step of steps) {
        ctx = await step(ctx);
    }

    return ctx;
}
