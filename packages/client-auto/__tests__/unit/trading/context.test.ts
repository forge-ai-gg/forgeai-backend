import { EnumStrategyType } from "@/lib/enums";
import * as getCharacterDetailsModule from "@/lib/get-character-details";
import { prisma } from "@/lib/prisma";
import { initializeTradingContext } from "@/trading/context";
import { TradingStrategyConfig } from "@/types/trading-strategy-config";
import { IAgentRuntime } from "@elizaos/core";
import { AgentStrategyAssignment, AgentTradingStrategy } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockStrategyConfig, createTokenPairs } from "../test-utils";

// Mock dependencies
vi.mock("@solana/web3.js", () => ({
    Connection: vi.fn().mockImplementation(() => ({
        // Add any Connection methods that might be used
    })),
}));

// Move the SolanaAgentKit mock implementation to the vi.mock call
vi.mock("solana-agent-kit", () => {
    return {
        SolanaAgentKit: vi.fn().mockImplementation(() => ({
            trade: vi.fn(),
            connection: vi.fn(),
        })),
    };
});

vi.mock("@/lib/prisma", () => ({
    prisma: {
        agentStrategyAssignment: {
            findFirstOrThrow: vi.fn(),
        },
    },
}));

vi.mock("@/lib/get-character-details", () => ({
    getAgentWalletDetails: vi.fn(),
}));

vi.mock("@elizaos/core", () => ({
    elizaLogger: {
        error: vi.fn(),
    },
}));

// Import after mocking
const { SolanaAgentKit } = await import("solana-agent-kit");

describe("initializeTradingContext", () => {
    // Setup common test variables
    const mockRuntime = {
        character: {
            id: "test-agent-id",
            settings: {
                secrets: {
                    SOLANA_PRIVATE_KEY: "encrypted-private-key",
                    SOLANA_WALLET_PUBLIC_KEY: "test-public-key",
                },
            },
        },
    } as unknown as IAgentRuntime;

    const mockCycle = 1;

    // Use a valid base58 string for the private key
    const mockPrivateKey =
        "5MaiiCavjCmn9Hs1o3eznqDEhRwxo7pXiAYez7keQUviUkauRiTMD8DrESdrNjN8zd9mTmVhRvBJeg5vhyvgrAhG";
    const mockPublicKey = "test-public-key";

    const mockAgentTradingStrategy = {
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
        defaultConfig: {} as any,
    } as AgentTradingStrategy;

    // Use the utility function to create a mock strategy config
    const mockTradingStrategyConfig: TradingStrategyConfig =
        createMockStrategyConfig(EnumStrategyType.RSI, [
            createTokenPairs().pair1,
        ]);

    const mockAgentStrategyAssignment = {
        id: "test-assignment-id",
        agentId: "test-agent-id",
        strategyId: "test-strategy-id",
        isActive: true,
        isPaperTrading: false,
        config: mockTradingStrategyConfig as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: "test-user-id",
        updatedById: "test-user-id",
        startDate: new Date(),
        endDate: new Date(),
    } as AgentStrategyAssignment;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default mocks
        vi.mocked(
            getCharacterDetailsModule.getAgentWalletDetails
        ).mockImplementation(() =>
            Promise.resolve({
                privateKey: mockPrivateKey,
                publicKey: mockPublicKey,
            })
        );

        // Fix the mock to return a proper Prisma client object that resolves correctly
        vi.mocked(
            prisma.agentStrategyAssignment.findFirstOrThrow
        ).mockImplementation(() => {
            return Promise.resolve({
                ...mockAgentStrategyAssignment,
                AgentTradingStrategy: mockAgentTradingStrategy,
            }) as any;
        });
    });

    it("should initialize trading context with correct values", async () => {
        // Act
        const result = await initializeTradingContext({
            runtime: mockRuntime,
            cycle: mockCycle,
        });

        // Assert
        expect(
            getCharacterDetailsModule.getAgentWalletDetails
        ).toHaveBeenCalledWith({
            runtime: mockRuntime,
            cycle: mockCycle,
        });

        expect(
            prisma.agentStrategyAssignment.findFirstOrThrow
        ).toHaveBeenCalledWith({
            where: {
                agentId: mockRuntime.character.id,
                isActive: true,
            },
            include: {
                AgentTradingStrategy: true,
            },
        });

        // Verify the returned context has all required properties
        expect(result).toEqual({
            runtime: mockRuntime,
            cycle: mockCycle,
            agentTradingStrategy: mockAgentTradingStrategy,
            agentStrategyAssignment: mockAgentStrategyAssignment,
            tradingStrategyConfig: mockTradingStrategyConfig,
            privateKey: mockPrivateKey,
            publicKey: mockPublicKey,
            solanaAgent: expect.anything(),
            isPaperTrading: false,
        });
    });

    it("should set isPaperTrading to true when agentStrategyAssignment.isPaperTrading is true", async () => {
        // Arrange
        vi.mocked(
            prisma.agentStrategyAssignment.findFirstOrThrow
        ).mockResolvedValue({
            ...mockAgentStrategyAssignment,
            isPaperTrading: true,
            AgentTradingStrategy: mockAgentTradingStrategy,
        } as any);

        // Act
        const result = await initializeTradingContext({
            runtime: mockRuntime,
            cycle: mockCycle,
        });

        // Assert
        expect(result.isPaperTrading).toBe(true);
    });

    it("should throw an error when getAgentWalletDetails fails", async () => {
        // Arrange
        const mockError = new Error("Failed to get wallet details");
        vi.mocked(
            getCharacterDetailsModule.getAgentWalletDetails
        ).mockRejectedValue(mockError);

        // Act & Assert
        await expect(
            initializeTradingContext({
                runtime: mockRuntime,
                cycle: mockCycle,
            })
        ).rejects.toThrow(mockError);
    });

    it("should throw an error when prisma query fails", async () => {
        // Arrange
        const mockError = new Error("Failed to find strategy assignment");
        vi.mocked(
            prisma.agentStrategyAssignment.findFirstOrThrow
        ).mockRejectedValue(mockError);

        // Act & Assert
        await expect(
            initializeTradingContext({
                runtime: mockRuntime,
                cycle: mockCycle,
            })
        ).rejects.toThrow(mockError);
    });
});
