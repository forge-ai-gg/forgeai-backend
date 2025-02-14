import { elizaLogger, IAgentRuntime } from "@elizaos/core";
import { Connection, PublicKey } from "@solana/web3.js";
import { SolanaAgentKit } from "solana-agent-kit";
import { rsi, sma } from "technicalindicators";
import { APOLLO_WALLET_ADDRESS } from "./forge/constants";
import {
    ACTIONS_PROMPTS,
    generateRandomThought,
    generateRandomThought as generateTradingThought,
} from "./forge/random-thoughts";
import { createMemory } from "./forge/utils";
import { fetchPriceHistory, fetchWalletPortfolio } from "./lib/birdeye";
import { tokenAddresses } from "./lib/constants";
import { EnumTradeStatus, EnumTradeType } from "./lib/enums";
import { getCharacterDetails } from "./lib/get-character-details";
import { prisma } from "./lib/prisma";
import { calculateProximityToThreshold } from "./lib/rsi-utils";
import { TimeInterval } from "./types/birdeye/api/common";
import { TradingStrategyConfig } from "./types/trading-strategy-config";

export async function update(runtime: IAgentRuntime, cycle: number) {
    const connection = new Connection(process.env.SOLANA_RPC_URL);

    const { privateKey, publicKey, tradingStrategyAssignment } =
        await getCharacterDetails({
            runtime,
            cycle,
        });

    // init solana agent
    const solanaAgent = new SolanaAgentKit(
        privateKey,
        process.env.SOLANA_RPC_URL,
        {
            OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        }
    );

    // get portolio balance
    const portfolio = await fetchWalletPortfolio(publicKey);

    // get trading strategy config
    const tradingStrategyConfig =
        tradingStrategyAssignment.config as TradingStrategyConfig;

    // todo - check trading preconditions ... i.e. is it even possible to trade right now based on the portfolio and the trading strategy
    // do i have an existing open position

    // get data required for the trading strategy
    // todo - support multiple tokens
    const { priceHistoryResponse, dataUrl } = await fetchPriceHistory({
        tokenAddress: tradingStrategyConfig.tokens[0].address,
        addressType: "token",
        period: tradingStrategyConfig.timeInterval as TimeInterval,
        timeFrom: Math.floor(
            (new Date().getTime() -
                tradingStrategyConfig.rsiConfig.length * 2 * 60 * 1000) /
                1000
        ), // 14 minutes
        timeTo: Math.floor(new Date().getTime() / 1000),
    });

    // get the simple moving average
    const simpleMovingAverage = sma({
        period: tradingStrategyConfig.rsiConfig.length,
        values: priceHistoryResponse.data.items.map((item) => item.value),
    });
    elizaLogger.info("SMA: ", simpleMovingAverage);

    const relativeStrengthIndex = rsi({
        period: tradingStrategyConfig.rsiConfig.length,
        values: priceHistoryResponse.data.items.map((item) => item.value),
    });
    elizaLogger.info("RSI: ", relativeStrengthIndex);

    const currentRsi = relativeStrengthIndex[relativeStrengthIndex.length - 1];

    // get existing open position
    const existingOpenPosition = await prisma.tradeHistory.findFirst({
        where: {
            status: EnumTradeStatus.OPEN,
            strategyAssignmentId: tradingStrategyAssignment.id,
        },
    });

    const proximityToThreshold = calculateProximityToThreshold(
        currentRsi,
        !!existingOpenPosition,
        tradingStrategyConfig.rsiConfig.overBought,
        tradingStrategyConfig.rsiConfig.overSold
    );

    elizaLogger.info(
        "Proximity to next action threshold: ",
        proximityToThreshold + "%"
    );

    const shouldBuy =
        currentRsi < tradingStrategyConfig.rsiConfig.overSold &&
        !existingOpenPosition;

    const shouldSell =
        currentRsi > tradingStrategyConfig.rsiConfig.overBought &&
        existingOpenPosition;

    // get the available amount in portfolio
    const availableAmountInPortfolio = portfolio.data.items.find(
        (item) => item.address === tradingStrategyConfig.tokens[0].address
    )?.uiAmount;

    // calculate the amount to trade
    const amountToTrade =
        (availableAmountInPortfolio *
            tradingStrategyConfig.maxPortfolioAllocation) /
        100;

    // execute the trading strategy
    // if i should buy, then we swap from USDC to the token
    // if i should sell, then we swap from the token to USDC
    if ((shouldBuy || shouldSell) && availableAmountInPortfolio > 0) {
        try {
            elizaLogger.info("TRADING CONDITIONS ARE MET!");

            elizaLogger.info(
                "AMOUNT IN PORTFOLIO: ",
                availableAmountInPortfolio
            );

            const tokenFromAddress = shouldBuy
                ? tokenAddresses.USDC
                : tradingStrategyConfig.tokens[0].address;
            const tokenToAddress = shouldBuy
                ? tradingStrategyConfig.tokens[0].address
                : tokenAddresses.USDC;

            const tokenFromSymbol = shouldBuy
                ? "USDC"
                : tradingStrategyConfig.tokens[0].symbol;
            const tokenToSymbol = shouldBuy
                ? tradingStrategyConfig.tokens[0].symbol
                : "USDC";

            const tx = await solanaAgent.trade(
                new PublicKey(tokenFromAddress),
                amountToTrade,
                new PublicKey(tokenToAddress)
            );
            elizaLogger.info("TX: ", tx);

            // todo - Get tx details using web3.js
            // const txDetails = await connection.getTransaction(tx, {
            //     maxSupportedTransactionVersion: 0,
            // });

            const tradingThought = await generateTradingThought({
                runtime,
                action: `Swapping ${amountToTrade} ${
                    shouldBuy ? "USDC" : tradingStrategyConfig.tokens[0].symbol
                } to ${
                    shouldBuy ? tradingStrategyConfig.tokens[0].symbol : "USDC"
                }`,
                details: {
                    walletAddress: APOLLO_WALLET_ADDRESS,
                },
            });

            // create the memory for the agent
            await createMemory({
                runtime,
                message: tradingThought.text,
                additionalContent: {
                    dataUrl,
                    currentRsi,
                    overBought: tradingStrategyConfig.rsiConfig.overBought,
                    overSold: tradingStrategyConfig.rsiConfig.overSold,
                    proximityToThreshold,
                    tx,
                },
            });

            await prisma.tradeHistory.create({
                data: {
                    side: shouldBuy ? "BUY" : "SELL",
                    timestamp: new Date(),
                    tokenFromAddress,
                    tokenToAddress,
                    tokenFromSymbol,
                    tokenToSymbol,
                    tokenFromAmount: amountToTrade.toString(),
                    tokenToAmount: "0", // todo - add the amount of tokens received
                    tokenFromDecimals: 6,
                    tokenToDecimals: 6,
                    entryPrice: 0, // todo - add the entry price
                    feesInUsd: 0, // todo - add the fees in USD
                    status: EnumTradeStatus.OPEN,
                    type: shouldBuy ? EnumTradeType.BUY : EnumTradeType.SELL,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    exitPrice: 0, // todo - add the exit price
                    profitLossUsd: 0, // todo - add the profit/loss
                    profitLossPercentage: 0, // todo - add the profit/loss percentage
                    transactionHash: tx,
                    failureReason: null,
                    metadata: {},
                    AgentStrategyAssignment: {
                        connect: { id: tradingStrategyAssignment.id },
                    },
                },
            });

            // log the trade
            elizaLogger.info("TRADING THOUGHT:", {
                text: tradingThought.text,
                tokenUsage: tradingThought.tokenUsage,
            });
        } catch (e) {
            elizaLogger.error("ERROR: ", e);
        }
    } else {
        // no-op
        const randomThought = await generateRandomThought({
            runtime,
            action: ACTIONS_PROMPTS[
                Math.floor(Math.random() * ACTIONS_PROMPTS.length)
            ],
            details: {
                walletAddress: APOLLO_WALLET_ADDRESS,
            },
        });

        elizaLogger.info("RANDOM THOUGHT:", {
            text: randomThought.text,
            tokenUsage: randomThought.tokenUsage,
            currentRsi,
            overBought: tradingStrategyConfig.rsiConfig.overBought,
            overSold: tradingStrategyConfig.rsiConfig.overSold,
        });

        // generate a thought about what to do
        await createMemory({
            runtime,
            message: randomThought.text,
            additionalContent: {
                dataUrl,
                proximityToThreshold,
            },
        });
    }
}
