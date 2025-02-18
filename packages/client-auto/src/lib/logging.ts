import { TradingContext } from "../types/trading-context";

export const buildTradingContextLogMessage = (ctx: TradingContext): string => {
    const tradingContextMessage = `
TRADING CONTEXT:
--------------------------------
Agent: ${ctx.runtime.character.name}
AgentId: ${ctx.runtime.character.id}
Cycle: ${ctx.cycle}
Wallet: ${ctx.publicKey.toString()}
Strategy: ${ctx.agentTradingStrategy.title} (${ctx.agentStrategyAssignment.id})
--------------------------------
PORTFOLIO:
${
    ctx.portfolio?.walletPortfolioItems?.length
        ? ctx.portfolio.walletPortfolioItems
              .map((item) => `${item.symbol}: ${item.uiAmount}`)
              .join("\n")
        : "None"
}
--------------------------------
OPEN POSITIONS:
${
    ctx.portfolio?.openPositions?.length
        ? ctx.portfolio.openPositions
              .map(
                  (pos) =>
                      `${pos.baseTokenSymbol}->${pos.quoteTokenSymbol}: Amount: ${pos.totalBaseAmount}, Entry: ${pos.entryPrice}`
              )
              .join("\n")
        : "None"
}
--------------------------------
TRADING PAIRS: 
${ctx.tradingStrategyConfig.tradingPairs
    .map((pair, index) => {
        return `${index + 1}. ${pair.to.symbol}/${pair.from.symbol}`;
    })
    .join("\n")}
--------------------------------
TRADE DECISIONS:
${
    ctx.tradeDecisions.length
        ? ctx.tradeDecisions
              .map((decision, index) => {
                  return `${index + 1}. ${decision.description}`;
              })
              .join("\n")
        : "None"
}
--------------------------------
${
    ctx.transactions
        ? `TRANSACTIONS:
${
    ctx.transactions.length
        ? ctx.transactions
              .map(
                  (t, i) => `
${i + 1}. ${t.decision.token.from} -> ${t.decision.token.to}
   Amount: ${t.decision.amount}
   Success: ${t.success}
   ${t.success ? `Hash: ${t.transactionHash}` : `Error: ${t.error?.message}`}
`
              )
              .join("\n")
        : "None"
}
--------------------------------
MEMORY:
${ctx.memory ? JSON.stringify(ctx.memory, null, 2) : "None"}
--------------------------------
`
        : ""
}`;

    return tradingContextMessage;
};
