import { beforeEach, describe, expect, it, vi } from "vitest";
import * as randomThoughtsModule from "../../src/forge/random-thoughts";
import * as tradingThoughtModule from "../../src/forge/trading-thought";
import * as utilsModule from "../../src/forge/utils";
import { EnumMemoryType, EnumStrategyType } from "../../src/lib/enums";
import {
    createIdleMemory,
    createTradeMemory,
    recordError,
    recordMemory,
} from "../../src/trading/memory";
import { TradingContext } from "../../src/types/trading-context";

// Mock dependencies
vi.mock("../../src/forge/random-thoughts", () => ({
    generateRandomThought: vi.fn(),
}));

vi.mock("../../src/forge/trading-thought", () => ({
    generateTradingThought: vi.fn(),
}));

vi.mock("../../src/forge/utils", () => ({
    createMemory: vi.fn(),
}));

describe("memory", () => {
    // Setup common test variables
    const mockRuntime = {
        character: {
            id: "test-character-id",
            name: "Test Character",
        },
        // Add other required runtime properties
    };

    const mockThoughtResponse = {
        text: "This is a test thought",
        tokenUsage: {
            input: 100,
            output: 200,
        },
    };

    const mockLogMessage = "Test log message";

    const mockTradingContext: Partial<TradingContext> = {
        runtime: mockRuntime as any,
        cycle: 1,
        logMessage: mockLogMessage,
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
            tokenPairs: [],
            timeInterval: "1D",
            maxPortfolioAllocation: 50,
        },
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default mocks
        vi.mocked(randomThoughtsModule.generateRandomThought).mockResolvedValue(
            mockThoughtResponse
        );
        vi.mocked(
            tradingThoughtModule.generateTradingThought
        ).mockResolvedValue(mockThoughtResponse);
        vi.mocked(utilsModule.createMemory).mockResolvedValue(undefined);
    });

    describe("recordMemory", () => {
        it("should call createTradeMemory when trade results exist", async () => {
            // Arrange
            const contextWithTradeResults = {
                ...mockTradingContext,
                tradeResults: [{ success: true }],
            };

            // Act
            const result = await recordMemory(
                contextWithTradeResults as TradingContext
            );

            // Assert
            expect(result).toEqual(mockThoughtResponse);
            expect(
                tradingThoughtModule.generateTradingThought
            ).toHaveBeenCalledWith({
                runtime: mockRuntime,
                action: `You analyzed the market and observed: ${mockLogMessage}`,
                details: mockLogMessage,
            });
            expect(utilsModule.createMemory).toHaveBeenCalledWith({
                runtime: mockRuntime,
                message: mockThoughtResponse.text,
                additionalContent: {
                    type: EnumMemoryType.TRADE,
                    logMessage: mockLogMessage,
                },
            });
        });

        it("should call createIdleMemory when no trade results exist", async () => {
            // Arrange
            const contextWithoutTradeResults = {
                ...mockTradingContext,
                tradeResults: [],
            };

            // Act
            const result = await recordMemory(
                contextWithoutTradeResults as TradingContext
            );

            // Assert
            expect(result).toEqual(mockThoughtResponse);
            expect(
                randomThoughtsModule.generateRandomThought
            ).toHaveBeenCalledWith({
                runtime: mockRuntime,
                action: `You analyzed the market and observed: ${mockLogMessage}`,
                details: mockLogMessage,
            });
            expect(utilsModule.createMemory).toHaveBeenCalledWith({
                runtime: mockRuntime,
                message: mockThoughtResponse.text,
                additionalContent: {
                    type: EnumMemoryType.IDLE,
                    logMessage: mockLogMessage,
                },
            });
        });

        it("should call createIdleMemory when trade results is undefined", async () => {
            // Arrange
            const contextWithUndefinedTradeResults = {
                ...mockTradingContext,
                tradeResults: undefined,
            };

            // Act
            const result = await recordMemory(
                contextWithUndefinedTradeResults as TradingContext
            );

            // Assert
            expect(result).toEqual(mockThoughtResponse);
            expect(
                randomThoughtsModule.generateRandomThought
            ).toHaveBeenCalled();
            expect(utilsModule.createMemory).toHaveBeenCalledWith(
                expect.objectContaining({
                    additionalContent: {
                        type: EnumMemoryType.IDLE,
                        logMessage: mockLogMessage,
                    },
                })
            );
        });
    });

    describe("createTradeMemory", () => {
        it("should generate a trading thought and create a memory", async () => {
            // Act
            const result = await createTradeMemory(
                mockTradingContext as TradingContext
            );

            // Assert
            expect(result).toEqual(mockThoughtResponse);
            expect(
                tradingThoughtModule.generateTradingThought
            ).toHaveBeenCalledWith({
                runtime: mockRuntime,
                action: `You analyzed the market and observed: ${mockLogMessage}`,
                details: mockLogMessage,
            });
            expect(utilsModule.createMemory).toHaveBeenCalledWith({
                runtime: mockRuntime,
                message: mockThoughtResponse.text,
                additionalContent: {
                    type: EnumMemoryType.TRADE,
                    logMessage: mockLogMessage,
                },
            });
        });

        it("should pass undefined runtime to dependencies when runtime is missing", async () => {
            // Arrange
            const contextWithoutRuntime = {
                ...mockTradingContext,
                runtime: undefined,
            };

            // Act
            const result = await createTradeMemory(
                contextWithoutRuntime as TradingContext
            );

            // Assert
            expect(result).toEqual(mockThoughtResponse);
            expect(
                tradingThoughtModule.generateTradingThought
            ).toHaveBeenCalledWith({
                runtime: undefined,
                action: `You analyzed the market and observed: ${mockLogMessage}`,
                details: mockLogMessage,
            });
            expect(utilsModule.createMemory).toHaveBeenCalledWith({
                runtime: undefined,
                message: mockThoughtResponse.text,
                additionalContent: {
                    type: EnumMemoryType.TRADE,
                    logMessage: mockLogMessage,
                },
            });
        });
    });

    describe("createIdleMemory", () => {
        it("should generate a random thought and create a memory", async () => {
            // Act
            const result = await createIdleMemory(
                mockTradingContext as TradingContext
            );

            // Assert
            expect(result).toEqual(mockThoughtResponse);
            expect(
                randomThoughtsModule.generateRandomThought
            ).toHaveBeenCalledWith({
                runtime: mockRuntime,
                action: `You analyzed the market and observed: ${mockLogMessage}`,
                details: mockLogMessage,
            });
            expect(utilsModule.createMemory).toHaveBeenCalledWith({
                runtime: mockRuntime,
                message: mockThoughtResponse.text,
                additionalContent: {
                    type: EnumMemoryType.IDLE,
                    logMessage: mockLogMessage,
                },
            });
        });

        it("should pass undefined runtime to dependencies when runtime is missing", async () => {
            // Arrange
            const contextWithoutRuntime = {
                ...mockTradingContext,
                runtime: undefined,
            };

            // Act
            const result = await createIdleMemory(
                contextWithoutRuntime as TradingContext
            );

            // Assert
            expect(result).toEqual(mockThoughtResponse);
            expect(
                randomThoughtsModule.generateRandomThought
            ).toHaveBeenCalledWith({
                runtime: undefined,
                action: `You analyzed the market and observed: ${mockLogMessage}`,
                details: mockLogMessage,
            });
            expect(utilsModule.createMemory).toHaveBeenCalledWith({
                runtime: undefined,
                message: mockThoughtResponse.text,
                additionalContent: {
                    type: EnumMemoryType.IDLE,
                    logMessage: mockLogMessage,
                },
            });
        });
    });

    describe("recordError", () => {
        it("should create an error memory", async () => {
            // Arrange
            const mockError = new Error("Test error");
            mockError.stack = "Test stack trace";

            // Act
            await recordError({
                runtime: mockRuntime as any,
                error: mockError,
                cycle: 1,
            });

            // Assert
            expect(utilsModule.createMemory).toHaveBeenCalledWith({
                runtime: mockRuntime,
                message: `Trading error: ${mockError.message}`,
                additionalContent: {
                    type: EnumMemoryType.ERROR,
                    error: mockError,
                    context: {
                        cycle: 1,
                        errorMessage: mockError.message,
                        stack: mockError.stack,
                    },
                },
            });
        });

        it("should handle missing stack trace", async () => {
            // Arrange
            const mockError = new Error("Test error");
            mockError.stack = undefined;

            // Act
            await recordError({
                runtime: mockRuntime as any,
                error: mockError,
                cycle: 1,
            });

            // Assert
            expect(utilsModule.createMemory).toHaveBeenCalledWith({
                runtime: mockRuntime,
                message: `Trading error: ${mockError.message}`,
                additionalContent: {
                    type: EnumMemoryType.ERROR,
                    error: mockError,
                    context: {
                        cycle: 1,
                        errorMessage: mockError.message,
                        stack: undefined,
                    },
                },
            });
        });
    });
});
