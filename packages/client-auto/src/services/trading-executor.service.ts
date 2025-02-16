import { elizaLogger, IAgentRuntime } from "@elizaos/core";
import { Connection } from "@solana/web3.js";
import { SolanaAgentKit } from "solana-agent-kit";
import { sma } from "technicalindicators";
import { config } from "../lib/config";
import { FORCE_LIVE_TRADING, FORCE_PAPER_TRADING } from "../lib/constants";
import { getCharacterDetails } from "../lib/get-character-details";
import { TimeInterval } from "../types/birdeye/api/common";
import { TradingStrategyConfig } from "../types/trading-strategy-config";
import { MarketDataService } from "./market-data.service";
import { MemoryService } from "./memory.service";
import { PortfolioService } from "./portfolio.service";
import { TradingStrategyService } from "./trading-strategy.service";
import { TradingService } from "./trading.service";

interface ExecuteTradeParams {
    shouldBuy: boolean;
    amountToTrade: number;
    tradingStrategyConfig: any; // Replace with proper type
    publicKey: string;
    currentRsi: number;
    proximityToThreshold: number;
    memoryText: string;
    memoryContext: Record<string, any>;
}

interface CreateIdleMemoryParams {
    tokenAddress: string;
    timeInterval: TimeInterval;
    proximityToThreshold: number;
    memoryText: string;
    memoryContext: Record<string, any>;
}

export class TradingExecutor {
    private connection: Connection;
    private solanaAgent: SolanaAgentKit;
    private marketDataService: MarketDataService;
    private tradingService: TradingService;
    private tradingStrategyService: TradingStrategyService;
    private memoryService: MemoryService;
    private portfolioService: PortfolioService;

    constructor(private runtime: IAgentRuntime, private cycle: number) {
        this.connection = new Connection(config.SOLANA_RPC_URL!, "confirmed");
        this.marketDataService = new MarketDataService();
        this.memoryService = new MemoryService(runtime);
        this.portfolioService = new PortfolioService();
    }

    async initialize() {
        const { privateKey, publicKey, tradingStrategyAssignment } =
            await getCharacterDetails({
                runtime: this.runtime,
                cycle: this.cycle,
            });

        this.solanaAgent = new SolanaAgentKit(
            privateKey,
            config.SOLANA_RPC_URL,
            {
                OPENAI_API_KEY: config.OPENAI_API_KEY,
            }
        );

        const tradingStrategyConfig =
            tradingStrategyAssignment.config as TradingStrategyConfig;
        const isPaperTrading =
            tradingStrategyAssignment.isPaperTrading ||
            (FORCE_PAPER_TRADING && !FORCE_LIVE_TRADING);

        this.tradingService = new TradingService(
            this.connection,
            this.solanaAgent,
            tradingStrategyConfig,
            tradingStrategyAssignment.id,
            isPaperTrading
        );

        this.tradingStrategyService = new TradingStrategyService(
            tradingStrategyAssignment
        );

        return {
            publicKey,
            tradingStrategyConfig,
            isPaperTrading,
        };
    }

    async analyzeMarket(tradingStrategyConfig: any) {
        const { rsi: relativeStrengthIndex } =
            await this.marketDataService.getMarketData(
                tradingStrategyConfig.tradingPairs[0].from.address,
                tradingStrategyConfig.tradingPairs[0].to.address,
                tradingStrategyConfig.timeInterval,
                tradingStrategyConfig.rsiConfig.length
            );

        const simpleMovingAverage = sma({
            period: tradingStrategyConfig.rsiConfig.length,
            values: relativeStrengthIndex,
        });

        const currentRsi =
            relativeStrengthIndex[relativeStrengthIndex.length - 1];

        elizaLogger.info(`SMA COUNT: ${simpleMovingAverage.length}`);

        return { currentRsi, simpleMovingAverage };
    }

    async executeTradingStrategy(params: {
        currentRsi: number;
        tradingStrategyConfig: any;
        publicKey: string;
    }) {
        const { currentRsi, tradingStrategyConfig, publicKey } = params;

        const { shouldBuy, shouldSell, proximityToThreshold } =
            await this.tradingStrategyService.evaluatePosition(currentRsi);

        const availableAmountInPortfolio =
            await this.portfolioService.getTokenBalance(
                publicKey,
                tradingStrategyConfig.tradingPairs[0].from.address
            );

        const amountToTrade = this.tradingStrategyService.calculateTradeAmount(
            availableAmountInPortfolio
        );

        return {
            shouldBuy,
            shouldSell,
            proximityToThreshold,
            availableAmountInPortfolio,
            amountToTrade,
        };
    }

    async executeTrade(params: ExecuteTradeParams) {
        const {
            shouldBuy,
            amountToTrade,
            tradingStrategyConfig,
            publicKey,
            currentRsi,
            proximityToThreshold,
            memoryText,
            memoryContext,
        } = params;

        const tokenFrom =
            tradingStrategyConfig.tradingPairs[0][shouldBuy ? "from" : "to"];
        const tokenTo =
            tradingStrategyConfig.tradingPairs[0][shouldBuy ? "to" : "from"];

        elizaLogger.info(
            `TRADE: ${shouldBuy ? "BUY" : "SELL"} ${amountToTrade} ${
                shouldBuy ? tokenFrom.symbol : tokenTo.symbol
            }`
        );

        const tx = await this.tradingService.executeTrade(
            shouldBuy,
            amountToTrade,
            tokenFrom,
            tokenTo
        );

        await this.recordTradeMemory({
            shouldBuy,
            amountToTrade,
            tokenFrom,
            tokenTo,
            publicKey,
            currentRsi,
            proximityToThreshold,
            tx,
            tradingStrategyConfig,
            memoryText,
            memoryContext,
        });

        return tx;
    }

    async createIdleMemory(params: CreateIdleMemoryParams) {
        return await this.memoryService.createIdleMemory(params);
    }

    private async recordTradeMemory(params: {
        shouldBuy: boolean;
        amountToTrade: number;
        tokenFrom: any;
        tokenTo: any;
        publicKey: string;
        currentRsi: number;
        proximityToThreshold: number;
        tx: string;
        tradingStrategyConfig: any;
        memoryText: string;
        memoryContext: Record<string, any>;
    }) {
        await this.memoryService.createTradeMemory({
            message: params.memoryText,
            tokenAddress: params.tokenFrom.address,
            timeInterval: params.tradingStrategyConfig.timeInterval,
            currentRsi: params.currentRsi,
            overBought: params.tradingStrategyConfig.rsiConfig.overBought,
            overSold: params.tradingStrategyConfig.rsiConfig.overSold,
            proximityToThreshold: params.proximityToThreshold,
            tx: params.tx,
            tradeHistory: null,
            memoryText: params.memoryText,
            memoryContext: params.memoryContext,
        });
    }
}
