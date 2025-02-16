import { elizaLogger, IAgentRuntime } from "@elizaos/core";
import { FORCE_TRADE } from "./lib/constants";
import { TradingExecutor } from "./services/trading-executor.service";

export async function update(runtime: IAgentRuntime, cycle: number) {
    const executor = new TradingExecutor(runtime, cycle);

    try {
        const { publicKey, tradingStrategyConfig, isPaperTrading } =
            await executor.initialize();

        // Analyze market conditions using RSI
        const { currentRsi } = await executor.analyzeMarket(
            tradingStrategyConfig
        );

        const {
            shouldBuy,
            shouldSell,
            proximityToThreshold,
            availableAmountInPortfolio,
            amountToTrade,
        } = await executor.executeTradingStrategy({
            currentRsi,
            tradingStrategyConfig,
            publicKey,
        });

        // Build context for memory
        const memoryContext = {
            marketAnalysis: {
                rsi: currentRsi,
                proximityToThreshold,
            },
            portfolio: {
                availableAmount: availableAmountInPortfolio,
                proposedTradeAmount: amountToTrade,
            },
            strategy: {
                type: shouldBuy ? "BUY" : shouldSell ? "SELL" : "HOLD",
                config: tradingStrategyConfig,
            },
            tradingMode: isPaperTrading ? "PAPER" : "LIVE",
        };

        // Generate memory text
        const memoryText = `Market Analysis: RSI at ${currentRsi.toFixed(2)} (${
            proximityToThreshold > 0
                ? `${proximityToThreshold.toFixed(2)}% from ${
                      shouldBuy ? "oversold" : "overbought"
                  } threshold at ${
                      shouldBuy
                          ? tradingStrategyConfig.rsiConfig.overSold
                          : tradingStrategyConfig.rsiConfig.overBought
                  }`
                : "at threshold"
        }). Portfolio has ${availableAmountInPortfolio} available. Strategy suggests ${
            shouldBuy ? "BUY" : shouldSell ? "SELL" : "HOLD"
        }${amountToTrade ? ` with amount ${amountToTrade}` : ""}. ${
            !shouldBuy && !shouldSell
                ? "Conditions not met for trading."
                : availableAmountInPortfolio <= 0 && !FORCE_TRADE
                ? "Insufficient portfolio balance for trade."
                : "Trading conditions met!"
        }`;

        if (
            ((shouldBuy || shouldSell) && availableAmountInPortfolio > 0) ||
            FORCE_TRADE
        ) {
            elizaLogger.info("TRADING CONDITIONS ARE MET!");
            elizaLogger.info(`PAPER TRADING: ${isPaperTrading}`);

            await executor.executeTrade({
                shouldBuy,
                amountToTrade,
                tradingStrategyConfig,
                publicKey,
                currentRsi,
                proximityToThreshold,
                memoryText,
                memoryContext,
            });
        } else {
            await executor.createIdleMemory({
                tokenAddress:
                    tradingStrategyConfig.tradingPairs[0].from.address,
                timeInterval: tradingStrategyConfig.timeInterval,
                proximityToThreshold,
                memoryText,
                memoryContext,
            });
        }
    } catch (e) {
        // TODO: Implement more detailed error handling and recovery strategies
        elizaLogger.error(
            `Trading execution error: ${JSON.stringify(e.message)}`
        );
    }
}
