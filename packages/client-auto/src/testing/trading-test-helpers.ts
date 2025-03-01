import { IAgentRuntime } from "@elizaos/core";
import {
    AgentStrategyAssignment,
    AgentTradingStrategy,
    Position,
} from "@prisma/client";
import { Connection } from "@solana/web3.js";
// import { SolanaAgentKit } from "solana-agent-kit";
import { EnumStrategyType } from "../src/lib/enums";
import { TradeResult } from "../src/trading/execute";
import { PortfolioState } from "../src/trading/portfolio";
import { AllTokenPriceHistory } from "../src/trading/price-history";
import { TradingContext } from "../src/types/trading-context";
import { TradeDecision } from "../src/types/trading-decision";
import { TradingStrategyConfig } from "../src/types/trading-strategy-config";

// Create a custom token type for testing that satisfies both Token interfaces
interface MockToken {
    address: string;
    symbol: string;
    decimals: number;
    logoURI: string;
    network?: string;
}

/**
 * Creates a mock trading context for testing
 * @param overrides Any properties to override in the default context
 * @returns A mock trading context
 */
export function createMockTradingContext(
    overrides: Partial<TradingContext> = {}
): TradingContext {
    // Create a basic mock token with required fields
    const mockToken: MockToken = {
        address: "mock-token-address",
        symbol: "MOCK",
        decimals: 9,
        logoURI: "https://example.com/logo.png",
    };

    // Create a basic mock trading strategy config
    const mockTradingStrategyConfig = {
        title: "RSI Trading Strategy",
        tokenPairs: [
            {
                from: mockToken as any,
                to: { ...mockToken, symbol: "USDC" } as any,
            },
        ],
        timeInterval: "1H",
        rsiConfig: {
            length: 14,
            overBought: 70,
            overSold: 30,
        },
        minLiquidityUsd: 1000,
        maxPortfolioAllocation: 10,
        type: EnumStrategyType.RSI,
    } as TradingStrategyConfig;

    // Create a basic mock portfolio state
    const mockPortfolio: PortfolioState = {
        walletPortfolioItems: [
            {
                address: mockToken.address,
                symbol: mockToken.symbol,
                decimals: mockToken.decimals,
                balance: "1000000000",
                uiAmount: 100,
                chainId: "solana",
                logoURI: mockToken.logoURI,
                priceUsd: 1,
                valueUsd: 100,
            },
        ],
        openPositions: [],
        totalValue: 100,
    };

    // Create a basic mock price history
    const mockPriceHistory: AllTokenPriceHistory = {
        [mockToken.address]: {
            token: mockToken as any,
            prices: [
                { unixTime: 1625097600, value: 1 },
                { unixTime: 1625184000, value: 1.1 },
                { unixTime: 1625270400, value: 1.2 },
            ],
        },
    };

    // Create a basic mock agent trading strategy
    const mockAgentTradingStrategy = {
        id: "mock-strategy-id",
        title: "Mock Strategy",
        shortDescription: "A mock trading strategy for testing",
        longDescription: "A detailed description of the mock trading strategy",
        organizationId: "mock-org-id",
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: "mock-user-id",
        updatedById: "mock-user-id",
        class: "trading",
        subclass: "rsi",
        defaultConfig: JSON.stringify(mockTradingStrategyConfig),
        isActive: true,
    } as unknown as AgentTradingStrategy;

    // Create a basic mock agent strategy assignment
    const mockAgentStrategyAssignment = {
        id: "mock-assignment-id",
        agentId: "mock-agent-id",
        strategyId: mockAgentTradingStrategy.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: "mock-user-id",
        updatedById: "mock-user-id",
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        isActive: true,
        config: JSON.stringify(mockTradingStrategyConfig),
        isPaperTrading: true,
    } as unknown as AgentStrategyAssignment;

    // Create a mock runtime
    const mockRuntime = {
        id: "mock-runtime-id",
        agentId: "mock-agent-id",
        serverUrl: "https://example.com",
        databaseAdapter: {},
        token: "mock-token",
        modelProvider: {},
        getSetting: () => "",
        cacheManager: {
            get: () => Promise.resolve(null),
            set: () => Promise.resolve(),
        },
    } as unknown as IAgentRuntime;

    // Create a mock solana agent
    // const mockSolanaAgent = {
    //     trade: vi.fn().mockResolvedValue("mock-transaction-hash"),
    // } as unknown as SolanaAgentKit;

    // Create the default context
    const defaultContext: TradingContext = {
        runtime: mockRuntime,
        cycle: 1,
        connection: {} as Connection,
        publicKey: "mock-public-key",
        privateKey: "mock-private-key",
        portfolio: mockPortfolio,
        priceHistory: mockPriceHistory,
        tradeDecisions: [],
        agentTradingStrategy: mockAgentTradingStrategy,
        agentStrategyAssignment: mockAgentStrategyAssignment,
        tradingStrategyConfig: mockTradingStrategyConfig,
        solanaAgent: undefined,
        isPaperTrading: true,
        tradeResults: [],
        logMessage: "",
        thoughtResponse: {
            text: "",
            tokenUsage: {
                input: 0,
                output: 0,
            },
        },
    };

    // Return the context with any overrides
    return {
        ...defaultContext,
        ...overrides,
    };
}

/**
 * Creates a mock trade decision for testing
 * @param overrides Any properties to override in the default decision
 * @returns A mock trade decision
 */
export function createMockTradeDecision(
    overrides: Partial<TradeDecision> = {}
): TradeDecision {
    // Create a basic mock token
    const mockToken: MockToken = {
        address: "mock-token-address",
        symbol: "MOCK",
        decimals: 9,
        logoURI: "https://example.com/logo.png",
    };

    // Create the default decision
    const defaultDecision: TradeDecision = {
        shouldOpen: true,
        shouldClose: false,
        amount: 1,
        description: "Mock trade decision",
        tokenPair: {
            from: mockToken as any,
            to: { ...mockToken, symbol: "USDC" } as any,
        },
        strategyAssignmentId: "mock-assignment-id",
    };

    // Return the decision with any overrides
    return {
        ...defaultDecision,
        ...overrides,
    };
}

/**
 * Creates a mock trade result for testing
 * @param overrides Any properties to override in the default result
 * @returns A mock trade result
 */
export function createMockTradeResult(
    overrides: Partial<TradeResult> = {}
): TradeResult {
    // Create the default result
    const defaultResult: TradeResult = {
        transaction: {
            id: "mock-transaction-id",
            strategyAssignmentId: "mock-assignment-id",
            baseTokenAddress: "mock-base-token-address",
            baseTokenSymbol: "MOCK",
            quoteTokenAddress: "mock-quote-token-address",
            quoteTokenSymbol: "USDC",
            baseAmount: "1",
            quoteAmount: "1",
            baseTokenPrice: 1,
            quoteTokenPrice: 1,
            type: "BUY",
            status: "COMPLETED",
            createdAt: new Date(),
            updatedAt: new Date(),
            positionId: null,
            error: null,
            userId: "mock-user-id",
            timestamp: new Date(),
            side: "BUY",
            metadata: {},
        } as any,
        position: null,
        success: true,
        error: undefined,
    };

    // Return the result with any overrides
    return {
        ...defaultResult,
        ...overrides,
    };
}

/**
 * Creates a mock position for testing
 * @param overrides Any properties to override in the default position
 * @returns A mock position
 */
export function createMockPosition(
    overrides: Partial<Position> = {}
): Position {
    // Create the default position
    const defaultPosition = {
        id: "mock-position-id",
        strategyAssignmentId: "mock-assignment-id",
        baseTokenAddress: "mock-base-token-address",
        baseTokenSymbol: "MOCK",
        quoteTokenAddress: "mock-quote-token-address",
        quoteTokenSymbol: "USDC",
        totalBaseAmount: "1",
        totalQuoteAmount: "1",
        averageEntryPrice: 1,
        currentPrice: 1,
        profitLoss: 0,
        profitLossPercentage: 0,
        status: "OPEN",
        createdAt: new Date(),
        updatedAt: new Date(),
        closedAt: null,
        openedAt: new Date(),
        baseTokenDecimals: 9,
        quoteTokenDecimals: 6,
        userId: "mock-user-id",
    } as unknown as Position;

    // Return the position with any overrides
    return {
        ...defaultPosition,
        ...overrides,
    };
}

/**
 * Runs a specific trading step with a mock context
 * @param step The step function to run
 * @param contextOverrides Any properties to override in the default context
 * @returns The updated context after running the step
 */
export async function runTradingStep(
    step: (ctx: TradingContext) => Promise<TradingContext>,
    contextOverrides: Partial<TradingContext> = {}
): Promise<TradingContext> {
    const mockContext = createMockTradingContext(contextOverrides);
    return await step(mockContext);
}

/**
 * Runs a sequence of trading steps with a mock context
 * @param steps The step functions to run in sequence
 * @param contextOverrides Any properties to override in the default context
 * @returns The updated context after running all steps
 */
export async function runTradingSteps(
    steps: Array<(ctx: TradingContext) => Promise<TradingContext>>,
    contextOverrides: Partial<TradingContext> = {}
): Promise<TradingContext> {
    let ctx = createMockTradingContext(contextOverrides);

    for (const step of steps) {
        ctx = await step(ctx);
    }

    return ctx;
}
