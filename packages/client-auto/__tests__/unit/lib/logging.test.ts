import { describe, expect, it } from "vitest";
import {
    EnumPositionStatus,
    EnumStrategyType,
    EnumTradeStatus,
} from "../../../src/lib/enums";
import { buildTradingContextLogMessage } from "../../../src/lib/logging";
import { TradeResult } from "../../../src/trading/execute";
import { TradingContext } from "../../../src/types/trading-context";

describe("logging", () => {
    // Setup mock data for testing
    const mockToken1 = {
        address: "token-address-1",
        symbol: "TEST1",
        logoURI: "test-logo-uri-1",
        decimals: 9,
        network: "solana",
        price: { value: 1.2 },
        liquidity: { usd: 1000000 },
        volume: { h24: 500000 },
        trustScore: 80,
    };

    const mockToken2 = {
        address: "token-address-2",
        symbol: "TEST2",
        logoURI: "test-logo-uri-2",
        decimals: 6,
        network: "solana",
        price: { value: 2.2 },
        liquidity: { usd: 2000000 },
        volume: { h24: 800000 },
        trustScore: 90,
    };

    const mockPosition = {
        id: "position-1",
        strategyAssignmentId: "test-assignment-id",
        status: EnumPositionStatus.OPEN,
        baseTokenAddress: mockToken2.address,
        baseTokenSymbol: mockToken2.symbol,
        baseTokenDecimals: mockToken2.decimals,
        baseTokenLogoURI: mockToken2.logoURI,
        quoteTokenAddress: mockToken1.address,
        quoteTokenSymbol: mockToken1.symbol,
        quoteTokenDecimals: mockToken1.decimals,
        quoteTokenLogoURI: mockToken1.logoURI,
        entryPrice: 1.8,
        exitPrice: null,
        totalBaseAmount: "50",
        averageEntryPrice: 1.8,
        realizedPnlUsd: null,
        totalFeesUsd: 0,
        side: "buy",
        metadata: {},
        openedAt: new Date(),
        closedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: null,
    };

    const mockPortfolioItem = {
        address: mockToken1.address,
        symbol: mockToken1.symbol,
        name: "Test Token 1",
        decimals: mockToken1.decimals,
        balance: "100000000000",
        uiAmount: 100,
        chainId: "solana",
        logoURI: mockToken1.logoURI,
        priceUsd: 1.2,
        valueUsd: 120,
    };

    const mockTransaction = {
        id: "transaction-1",
        strategyAssignmentId: "test-assignment-id",
        side: "BUY",
        status: EnumTradeStatus.OPEN,
        type: "BUY",
        timestamp: new Date(),
        tokenFromAddress: mockToken1.address,
        tokenToAddress: mockToken2.address,
        tokenFromSymbol: mockToken1.symbol,
        tokenToSymbol: mockToken2.symbol,
        tokenFromAmount: "100",
        tokenToAmount: "45.45",
        tokenFromDecimals: mockToken1.decimals,
        tokenToDecimals: mockToken2.decimals,
        tokenFromLogoURI: mockToken1.logoURI,
        tokenToLogoURI: mockToken2.logoURI,
        tokenFromPrice: 1.2,
        tokenToPrice: 2.2,
        feesInUsd: 0,
        profitLossUsd: 0,
        profitLossPercentage: 0,
        transactionHash:
            "0000000000000000000000000000000000000000000000000000000000000000",
        failureReason: null,
        metadata: {},
        positionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: null,
    };

    const mockTradeResult: TradeResult = {
        transaction: mockTransaction,
        position: mockPosition,
        success: true,
    };

    const mockFailedTradeResult: TradeResult = {
        transaction: {
            ...mockTransaction,
            status: EnumTradeStatus.FAILED,
            failureReason: "Test failure reason",
        },
        success: false,
        error: new Error("Test error message"),
    };

    const mockTradingContext: TradingContext = {
        cycle: 1,
        publicKey: "test-public-key",
        privateKey: "test-private-key",
        isPaperTrading: true,
        runtime: {
            character: {
                id: "test-character-id",
                name: "Test Character",
            },
        } as any,
        agentTradingStrategy: {
            id: "test-strategy-id",
            title: "Test Strategy",
            shortDescription: "Test strategy description",
            longDescription: "Test strategy long description",
            organizationId: "test-org-id",
            createdAt: new Date(),
            updatedAt: new Date(),
            createdById: "test-user-id",
            updatedById: "test-user-id",
            class: "trading",
            subclass: "rsi",
            defaultConfig: {},
        },
        agentStrategyAssignment: {
            id: "test-assignment-id",
            agentId: "test-agent-id",
            strategyId: "test-strategy-id",
            isActive: true,
            isPaperTrading: false,
            config: {},
            createdAt: new Date(),
            updatedAt: new Date(),
            createdById: "test-user-id",
            updatedById: "test-user-id",
            startDate: new Date(),
            endDate: null,
        },
        tradingStrategyConfig: {
            title: "Test Strategy",
            type: EnumStrategyType.RSI,
            tokenPairs: [
                {
                    from: mockToken1,
                    to: mockToken2,
                },
            ],
            timeInterval: "1D",
            maxPortfolioAllocation: 50,
        },
        portfolio: {
            walletPortfolioItems: [mockPortfolioItem],
            openPositions: [mockPosition],
            totalValue: 120,
        },
        priceHistory: {
            [mockToken1.address]: {
                token: mockToken1,
                prices: [
                    { unixTime: 1625011200, value: 1.0 },
                    { unixTime: 1625097600, value: 1.2 },
                ],
            },
            [mockToken2.address]: {
                token: mockToken2,
                prices: [
                    { unixTime: 1625011200, value: 2.0 },
                    { unixTime: 1625097600, value: 2.2 },
                ],
            },
        },
        tradeDecisions: [
            {
                shouldOpen: true,
                shouldClose: false,
                tokenPair: {
                    from: mockToken1,
                    to: mockToken2,
                },
                amount: 100,
                strategyAssignmentId: "test-assignment-id",
                description: "Buy signal detected",
                position: undefined,
            },
        ],
        tradeResults: [mockTradeResult],
        thoughtResponse: {
            text: "This is a test thought response",
            tokenUsage: {
                input: 100,
                output: 200,
            },
        },
    };

    it("should build a complete trading context log message", () => {
        // Act
        const logMessage = buildTradingContextLogMessage(mockTradingContext);

        // Assert
        expect(logMessage).toContain("TRADING CONTEXT:");
        expect(logMessage).toContain(
            `Agent:        ${mockTradingContext.runtime?.character.name}`
        );
        expect(logMessage).toContain(
            `AgentId:      ${mockTradingContext.runtime?.character.id}`
        );
        expect(logMessage).toContain(
            `Cycle:        ${mockTradingContext.cycle}`
        );
        expect(logMessage).toContain(
            `Wallet:       ${mockTradingContext.publicKey}`
        );
        expect(logMessage).toContain(
            `PaperTrading: ${mockTradingContext.isPaperTrading}`
        );
        expect(logMessage).toContain(
            `Strategy:     ${mockTradingContext.agentTradingStrategy.title}`
        );
    });

    it("should include portfolio information in the log message", () => {
        // Act
        const logMessage = buildTradingContextLogMessage(mockTradingContext);

        // Assert
        expect(logMessage).toContain("PORTFOLIO:");
        expect(logMessage).toContain(mockPortfolioItem.symbol);
        expect(logMessage).toContain(mockPortfolioItem.uiAmount.toString());
        expect(logMessage).toContain(mockPortfolioItem.priceUsd.toFixed(4));
    });

    it("should include open positions in the log message", () => {
        // Act
        const logMessage = buildTradingContextLogMessage(mockTradingContext);

        // Assert
        expect(logMessage).toContain("OPEN POSITIONS BEFORE:");
        expect(logMessage).toContain(mockPosition.baseTokenSymbol);
        expect(logMessage).toContain(mockPosition.quoteTokenSymbol);
        expect(logMessage).toContain(mockPosition.totalBaseAmount);
        expect(logMessage).toContain(mockPosition.entryPrice.toString());
    });

    it("should include trading pairs in the log message", () => {
        // Act
        const logMessage = buildTradingContextLogMessage(mockTradingContext);

        // Assert
        expect(logMessage).toContain("TRADING PAIRS:");
        expect(logMessage).toContain(
            `1. ${mockToken2.symbol}/${mockToken1.symbol}`
        );
    });

    it("should include trade decisions in the log message", () => {
        // Act
        const logMessage = buildTradingContextLogMessage(mockTradingContext);

        // Assert
        expect(logMessage).toContain("TRADE DECISIONS:");
        expect(logMessage).toContain("1. Buy signal detected");
    });

    it("should include transaction information in the log message", () => {
        // Act
        const logMessage = buildTradingContextLogMessage(mockTradingContext);

        // Assert
        expect(logMessage).toContain("TRANSACTIONS:");
        expect(logMessage).toContain(
            `1. ${mockTransaction.tokenFromSymbol} -> ${mockTransaction.tokenToSymbol}`
        );
        expect(logMessage).toContain(
            `tokenFromAmount: ${mockTransaction.tokenFromAmount}`
        );
        expect(logMessage).toContain(
            `tokenToAmount: ${mockTransaction.tokenToAmount}`
        );
        expect(logMessage).toContain(`Success: true`);
        expect(logMessage).toContain(`TxId: ${mockTransaction.id}`);
        expect(logMessage).toContain(
            `Hash: ${mockTransaction.transactionHash}`
        );
    });

    it("should include thought response in the log message", () => {
        // Act
        const logMessage = buildTradingContextLogMessage(mockTradingContext);

        // Assert
        expect(logMessage).toContain("THOUGHT:");
        expect(logMessage).toContain(mockTradingContext.thoughtResponse?.text);
    });

    it("should handle missing portfolio data", () => {
        // Arrange
        const contextWithoutPortfolio = {
            ...mockTradingContext,
            portfolio: undefined,
        };

        // Act
        const logMessage = buildTradingContextLogMessage(
            contextWithoutPortfolio
        );

        // Assert
        expect(logMessage).toContain("PORTFOLIO:");
        expect(logMessage).toContain("None");
        expect(logMessage).toContain("OPEN POSITIONS BEFORE:");
        expect(logMessage).toContain("None");
    });

    it("should handle missing trade decisions", () => {
        // Arrange
        const contextWithoutTradeDecisions = {
            ...mockTradingContext,
            tradeDecisions: [],
        };

        // Act
        const logMessage = buildTradingContextLogMessage(
            contextWithoutTradeDecisions
        );

        // Assert
        expect(logMessage).toContain("TRADE DECISIONS:");
        expect(logMessage).toContain("None");
    });

    it("should handle missing trade results", () => {
        // Arrange
        const contextWithoutTradeResults = {
            ...mockTradingContext,
            tradeResults: undefined,
        };

        // Act
        const logMessage = buildTradingContextLogMessage(
            contextWithoutTradeResults
        );

        // Assert
        expect(logMessage).not.toContain("TRANSACTIONS:");
    });

    it("should handle failed trade results", () => {
        // Arrange
        const mockErrorMessage = "Test error message";
        const mockFailedTradeResult: TradeResult = {
            transaction: {
                ...mockTransaction,
                status: EnumTradeStatus.FAILED,
                failureReason: "Test failure reason",
            },
            success: false,
            error: new Error(mockErrorMessage),
        };

        const contextWithFailedTrade = {
            ...mockTradingContext,
            tradeResults: [mockFailedTradeResult],
        };

        // Act
        const logMessage = buildTradingContextLogMessage(
            contextWithFailedTrade
        );

        // Assert
        expect(logMessage).toContain("TRANSACTIONS:");
        expect(logMessage).toContain(`Success: false`);
        expect(logMessage).toContain(`Error: ${mockErrorMessage}`);
    });

    it("should handle missing thought response", () => {
        // Arrange
        const contextWithoutThought = {
            ...mockTradingContext,
            thoughtResponse: undefined,
        };

        // Act
        const logMessage = buildTradingContextLogMessage(contextWithoutThought);

        // Assert
        expect(logMessage).toContain("THOUGHT:");
        expect(logMessage).toContain("None");
    });
});
