import { TradingContext } from "../types/trading-context";

export const buildTradingContextLogMessage = (ctx: TradingContext): string => {
    const sections = [
        buildHeaderSection(ctx),
        buildPortfolioSection(ctx),
        buildOpenPositionsSection(ctx),
        buildTradingPairsSection(ctx),
        buildTradeDecisionsSection(ctx),
        ctx.transactions ? buildTransactionsSection(ctx) : "",
        buildMemorySection(ctx),
    ];

    return sections.join("\n--------------------------------\n");
};

const buildHeaderSection = (ctx: TradingContext): string => `
TRADING CONTEXT:
--------------------------------
Agent: ${ctx.runtime.character.name}
AgentId: ${ctx.runtime.character.id}
Cycle: ${ctx.cycle}
Wallet: ${ctx.publicKey.toString()}
Strategy: ${ctx.agentTradingStrategy.title} (${
    ctx.agentStrategyAssignment.id
})`;

const buildPortfolioSection = (ctx: TradingContext): string => {
    const portfolioItems = ctx.portfolio?.walletPortfolioItems?.length
        ? ctx.portfolio.walletPortfolioItems
              .map((item) => formatPortfolioItem(item))
              .join("\n")
        : "None";

    return `PORTFOLIO:\n${portfolioItems}`;
};

const formatPortfolioItem = (item: any) =>
    `${item.symbol}: ${item.uiAmount} @ $${
        item.priceUsd?.toFixed(4) || 0
    } = $${(item.valueUsd || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

const buildOpenPositionsSection = (ctx: TradingContext): string => {
    const positions = ctx.portfolio?.openPositions?.length
        ? ctx.portfolio.openPositions
              .map((pos) => formatPosition(pos))
              .join("\n")
        : "None";

    return `OPEN POSITIONS:\n${positions}`;
};

const formatPosition = (pos: any) =>
    `${pos.baseTokenSymbol}->${pos.quoteTokenSymbol}: Amount: ${pos.totalBaseAmount}, Entry: ${pos.entryPrice}`;

const buildTradingPairsSection = (ctx: TradingContext): string => {
    const pairs = ctx.tradingStrategyConfig.tradingPairs
        .map(
            (pair, index) =>
                `${index + 1}. ${pair.to.symbol}/${pair.from.symbol}`
        )
        .join("\n");

    return `TRADING PAIRS:\n${pairs}`;
};

const buildTradeDecisionsSection = (ctx: TradingContext): string => {
    const decisions = ctx.tradeDecisions.length
        ? ctx.tradeDecisions
              .map((decision, index) => `${index + 1}. ${decision.description}`)
              .join("\n")
        : "None";

    return `TRADE DECISIONS:\n${decisions}`;
};

const buildTransactionsSection = (ctx: TradingContext): string => {
    const transactions = ctx.transactions.length
        ? ctx.transactions.map((t, i) => formatTransaction(t, i)).join("\n")
        : "None";

    return `TRANSACTIONS:\n${transactions}`;
};

const formatTransaction = (t: any, i: number) => `
${i + 1}. ${t.decision.token.from} -> ${t.decision.token.to}
   Amount: ${t.decision.amount}
   Success: ${t.success}
   ${t.success ? `Hash: ${t.transactionHash}` : `Error: ${t.error?.message}`}`;

const buildMemorySection = (ctx: TradingContext): string =>
    `MEMORY:\n${ctx.memory ? JSON.stringify(ctx.memory, null, 2) : "None"}`;
