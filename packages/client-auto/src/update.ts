import { elizaLogger, IAgentRuntime } from "@elizaos/core";
import { Connection } from "@solana/web3.js";
import { config } from "./lib/config";
import { getAgentWalletDetails } from "./lib/get-character-details";
import { prisma } from "./lib/prisma";
import { handleError } from "./trading/error";
import { evaluateTradeDecisions } from "./trading/execute";
import { getPortfolio } from "./trading/portfolio";
import { getPriceHistory } from "./trading/price-history";
import { TradingContext } from "./types/trading-context";
import { TradingStrategyConfig } from "./types/trading-strategy-config";

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

        // 4. Evaluate trading decisions for all trading pairs in the trading strategy config
        ctx.tradeDecisions = await evaluateTradeDecisions(ctx);
        elizaLogger.info(`Evaluated trade decision...`);

        // 5. Execute trade if needed
        // let tx: string | undefined;
        // if (decision.shouldTrade) {
        //     tx = await executeTrade(ctx, decision);
        //     elizaLogger.info(`Executed trade...`);
        // }

        logTradingContext(ctx);

        // 6. Record memory
        // await recordMemory({
        //     ...ctx,
        //     decision,
        //     tx,
        // });
    } catch (error) {
        await handleError({ runtime, cycle, error });
    }
}

async function initializeTradingContext({
    runtime,
    cycle,
}: {
    runtime: IAgentRuntime;
    cycle: number;
}): Promise<TradingContext> {
    try {
        const { privateKey, publicKey } = await getAgentWalletDetails({
            runtime,
            cycle,
        });

        // Create a connection to the Solana blockchain
        const connection = new Connection(config.SOLANA_RPC_URL!, "confirmed");

        // Get the active trading strategy assignment
        const agentStrategyAssignment =
            await prisma.agentStrategyAssignment.findFirstOrThrow({
                where: {
                    agentId: runtime.character.id,
                    isActive: true,
                },
                include: {
                    AgentTradingStrategy: true,
                },
            });

        // parse out the agent trading strategy and trading strategy config
        const agentTradingStrategy =
            agentStrategyAssignment.AgentTradingStrategy;
        const tradingStrategyConfig =
            agentStrategyAssignment.config as TradingStrategyConfig;

        return {
            runtime,
            cycle,
            connection,
            agentTradingStrategy,
            agentStrategyAssignment,
            tradingStrategyConfig,
            privateKey,
            publicKey,
        };
    } catch (error) {
        elizaLogger.error(
            `Error initializing trading context: ${error}`,
            error
        );
        throw error;
    }
}

const logTradingContext = (ctx: TradingContext) => {
    const tradingContextMessage = `
TRADING CONTEXT:
--------------------------------
Agent: ${ctx.runtime.character.name}
AgentId: ${ctx.runtime.character.id}
Cycle: ${ctx.cycle}
Wallet: ${ctx.publicKey.toString()}
Strategy: ${ctx.agentTradingStrategy.title} (${ctx.agentStrategyAssignment.id})
--------------------------------
TRADING PAIRS: 
${ctx.tradingStrategyConfig.tradingPairs
    .map((pair, index) => {
        return `${index + 1}. ${pair.to.symbol}/${pair.from.symbol}`;
    })
    .join("\n")}
--------------------------------
TRADE DECISIONS:
${ctx.tradeDecisions
    .map((decision, index) => {
        return `${index + 1}. ${decision.description}`;
    })
    .join("\n")}
--------------------------------
`;

    //     const portfolioMessage = ctx.portfolio
    //         ? `
    // PORTFOLIO:
    // --------------------------------
    // Value: $${ctx.portfolio.totalValue.toFixed(2)}
    // Base: ${ctx.portfolio.walletPortfolioItems.base.balance.toFixed(6)} ${
    //               ctx.portfolio.walletPortfolioItems.base.symbol
    //           }
    // Quote: ${ctx.portfolio.walletPortfolioItems.quote.balance.toFixed(6)} ${
    //               ctx.portfolio.walletPortfolioItems.quote.symbol
    //           }
    // f
    // OPEN POSITIONS:
    // --------------------------------
    // ${ctx.portfolio.openPositions
    //     .map(
    //         (pos) =>
    //             `${pos.side} ${pos.size} ${pos.baseSymbol}/${
    //                 pos.quoteSymbol
    //             } | Entry: $${pos.entryPrice.toFixed(
    //                 6
    //             )} | Current: $${pos.currentPrice.toFixed(
    //                 6
    //             )} | PnL: ${pos.unrealizedPnl.toFixed(2)}%`
    //     )
    //     .join("\n")}
    // --------------------------------`
    //         : "Portfolio data not available";

    elizaLogger.info(tradingContextMessage);
    // elizaLogger.info(portfolioMessage);
};
