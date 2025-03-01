import { IAgentRuntime } from "@elizaos/core";
import { AgentStrategyAssignment, AgentTradingStrategy } from "@prisma/client";
import { Connection } from "@solana/web3.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { config } from "../../src/lib/config";
import { EnumStrategyType } from "../../src/lib/enums";
import * as getCharacterDetailsModule from "../../src/lib/get-character-details";
import { prisma } from "../../src/lib/prisma";
import { initializeTradingContext } from "../../src/trading/context";
import { TradingStrategyConfig } from "../../src/types/trading-strategy-config";

// Mock dependencies
vi.mock("@solana/web3.js", () => ({
    Connection: vi.fn().mockImplementation(() => ({
        // Add any Connection methods that might be used
    })),
}));

vi.mock("solana-agent-kit", () => ({
    SolanaAgentKit: vi.fn().mockImplementation(() => ({
        // Mock SolanaAgentKit methods
    })),
}));

vi.mock("../../src/lib/prisma", () => ({
    prisma: {
        agentStrategyAssignment: {
            findFirstOrThrow: vi.fn(),
        },
    },
}));

vi.mock("../../src/lib/get-character-details", () => ({
    getAgentWalletDetails: vi.fn(),
}));

vi.mock("@elizaos/core", () => ({
    elizaLogger: {
        error: vi.fn(),
    },
}));

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

    const mockTradingStrategyConfig: TradingStrategyConfig = {
        title: "RSI Strategy",
        type: EnumStrategyType.RSI,
        tokenPairs: [
            {
                from: {
                    address: "test-token-address-1",
                    symbol: "TEST1",
                    logoURI: "test-logo-uri-1",
                    decimals: 9,
                    network: "solana",
                },
                to: {
                    address: "test-token-address-2",
                    symbol: "TEST2",
                    logoURI: "test-logo-uri-2",
                    decimals: 6,
                    network: "solana",
                },
            },
        ],
        timeInterval: "1D" as any, // Use a string value for TimeInterval
        maxPortfolioAllocation: 50,
        rsiConfig: {
            length: 14,
            overBought: 70,
            overSold: 30,
        },
    };

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
        ).mockResolvedValue({
            privateKey: mockPrivateKey,
            publicKey: mockPublicKey,
        });

        vi.mocked(
            prisma.agentStrategyAssignment.findFirstOrThrow
        ).mockResolvedValue({
            ...mockAgentStrategyAssignment,
            AgentTradingStrategy: mockAgentTradingStrategy,
        } as any);
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

        expect(Connection).toHaveBeenCalledWith(
            config.SOLANA_RPC_URL,
            "confirmed"
        );

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
            connection: expect.anything(),
            agentTradingStrategy: mockAgentTradingStrategy,
            agentStrategyAssignment: mockAgentStrategyAssignment,
            tradingStrategyConfig: mockTradingStrategyConfig,
            privateKey: mockPrivateKey,
            publicKey: mockPublicKey,
            solanaAgent: undefined,
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
