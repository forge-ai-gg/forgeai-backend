import { TimeInterval } from "../types/birdeye/api/common";

export interface IMarketData {
    sma: number[];
    rsi: number[];
    priceHistoryFromToken: any;
    priceHistoryToToken: any;
}

export interface ITradeResult {
    tx: string;
    swapDetails: any;
}

export interface IPositionEvaluation {
    shouldBuy: boolean;
    shouldSell: boolean;
    proximityToThreshold: number;
    existingOpenPosition: any;
}

export interface IMarketDataService {
    getMarketData(
        tokenFromAddress: string,
        tokenToAddress: string,
        timeInterval: TimeInterval,
        rsiLength: number
    ): Promise<IMarketData>;
}

export interface ITradingService {
    executeTrade(
        shouldBuy: boolean,
        amountToTrade: number,
        tokenFrom: any,
        tokenTo: any
    ): Promise<string>;
}

export interface ITradingStrategyService {
    evaluatePosition(currentRsi: number): Promise<IPositionEvaluation>;
    calculateTradeAmount(availableAmount: number): number;
}

export interface IPortfolioService {
    getTokenBalance(publicKey: string, tokenAddress: string): Promise<number>;
    getOpenPositions(strategyAssignmentId: string): Promise<any>;
}

export interface IMemoryService {
    createTradeMemory(params: {
        message: string;
        tokenAddress: string;
        timeInterval: TimeInterval;
        currentRsi: number;
        overBought: number;
        overSold: number;
        proximityToThreshold: number;
        tx: string;
        tradeHistory: any;
    }): Promise<any>;

    createIdleMemory(params: {
        tokenAddress: string;
        timeInterval: TimeInterval;
        proximityToThreshold: number;
    }): Promise<any>;

    generateTradingThought(params: {
        amountToTrade: number;
        shouldBuy: boolean;
        tokenFromSymbol: string;
        tokenToSymbol: string;
        walletAddress: string;
    }): Promise<any>;
}
