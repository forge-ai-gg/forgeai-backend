export interface TradingStrategyConfig {
    timeInterval: number;
    tradingPairs: Array<{
        from: { address: string };
        to: { address: string };
    }>;
    // ... other common config properties
}

export interface StrategyEvaluationResult {
    shouldBuy: boolean;
    shouldSell: boolean;
    proximityToThreshold: number;
    availableAmountInPortfolio: number;
    amountToTrade: number;
}

export interface MemoryContextData {
    proximityToThreshold: number;
    availableAmountInPortfolio: number;
    amountToTrade: number;
    shouldBuy: boolean;
    shouldSell: boolean;
    tradingStrategyConfig: TradingStrategyConfig;
    isPaperTrading: boolean;
    [key: string]: any; // Allow strategy-specific context data
}

export interface ITradingStrategy {
    analyzeMarket(): Promise<any>;
    evaluateStrategy(params: any): Promise<any>;
    buildMemoryContext(params: any): any;
    generateMemoryText(params: any): string;
}
