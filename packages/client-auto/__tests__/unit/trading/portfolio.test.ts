import { EnumPositionStatus } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { getPortfolio } from "@/trading/portfolio";
import * as solanaModule from "@/trading/solana";
import { WalletPortfolioItem } from "@/types/birdeye/api/wallet";
import { Position } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockPosition, mockTokens } from "../../test-utils";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
    prisma: {
        position: {
            findMany: vi.fn(),
        },
    },
}));

vi.mock("@/trading/solana", () => ({
    getWalletPortfolio: vi.fn(),
}));

describe("getPortfolio", () => {
    // Setup common test variables
    const mockAgentStrategyAssignmentId = "test-assignment-id";
    const mockPublicKey = "test-public-key";

    // Use the utility function to create mock positions
    const mockPositions: Position[] = [
        createMockPosition({
            id: "position-1",
            strategyAssignmentId: mockAgentStrategyAssignmentId,
            baseTokenAddress: mockTokens.token1.address,
            baseTokenSymbol: mockTokens.token1.symbol,
            baseTokenDecimals: mockTokens.token1.decimals,
            baseTokenLogoURI: mockTokens.token1.logoURI,
            quoteTokenAddress: mockTokens.usdc.address,
            quoteTokenSymbol: mockTokens.usdc.symbol,
            quoteTokenDecimals: mockTokens.usdc.decimals,
            quoteTokenLogoURI: mockTokens.usdc.logoURI,
            entryPrice: 1.5,
            totalBaseAmount: "100",
            averageEntryPrice: 1.5,
        }),
        createMockPosition({
            id: "position-2",
            strategyAssignmentId: mockAgentStrategyAssignmentId,
            baseTokenAddress: mockTokens.token2.address,
            baseTokenSymbol: mockTokens.token2.symbol,
            baseTokenDecimals: mockTokens.token2.decimals,
            baseTokenLogoURI: mockTokens.token2.logoURI,
            quoteTokenAddress: mockTokens.usdc.address,
            quoteTokenSymbol: mockTokens.usdc.symbol,
            quoteTokenDecimals: mockTokens.usdc.decimals,
            quoteTokenLogoURI: mockTokens.usdc.logoURI,
            entryPrice: 3.0,
            totalBaseAmount: "50",
            averageEntryPrice: 3.0,
        }),
    ];

    const mockWalletPortfolioItems: WalletPortfolioItem[] = [
        {
            address: mockTokens.token1.address,
            symbol: mockTokens.token1.symbol,
            name: "Test Token 1",
            decimals: mockTokens.token1.decimals,
            balance: "100000000000",
            uiAmount: 100,
            chainId: "solana",
            logoURI: mockTokens.token1.logoURI,
            priceUsd: 2.0,
            valueUsd: 200,
        },
        {
            address: mockTokens.token2.address,
            symbol: mockTokens.token2.symbol,
            name: "Test Token 2",
            decimals: mockTokens.token2.decimals,
            balance: "50000000",
            uiAmount: 50,
            chainId: "solana",
            logoURI: mockTokens.token2.logoURI,
            priceUsd: 2.8,
            valueUsd: 140,
        },
        {
            address: "token-address-3",
            symbol: "TEST3",
            name: "Test Token 3",
            decimals: 8,
            balance: "25000000",
            uiAmount: 25,
            chainId: "solana",
            logoURI: "test-logo-uri-3",
            priceUsd: 3.0,
            valueUsd: 75,
        },
    ];

    const mockWalletPortfolioResponse = {
        success: true,
        data: {
            wallet: mockPublicKey,
            totalUsd: 415,
            items: mockWalletPortfolioItems,
        },
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default mocks
        vi.mocked(prisma.position.findMany).mockResolvedValue(mockPositions);

        vi.mocked(solanaModule.getWalletPortfolio).mockResolvedValue(
            mockWalletPortfolioResponse as any
        );
    });

    it("should return portfolio with correct values", async () => {
        // Act
        const result = await getPortfolio({
            agentStrategyAssignmentId: mockAgentStrategyAssignmentId,
            publicKey: mockPublicKey,
        });

        // Assert
        expect(prisma.position.findMany).toHaveBeenCalledWith({
            where: {
                strategyAssignmentId: mockAgentStrategyAssignmentId,
                status: EnumPositionStatus.OPEN,
            },
        });

        expect(solanaModule.getWalletPortfolio).toHaveBeenCalledWith(
            mockPublicKey
        );

        // Calculate expected total value
        const expectedTotalValue = mockWalletPortfolioItems.reduce(
            (sum, item) => sum + item.valueUsd,
            0
        );

        // Verify the returned portfolio has all required properties
        expect(result).toEqual({
            openPositions: mockPositions,
            walletPortfolioItems: mockWalletPortfolioItems,
            totalValue: expectedTotalValue,
        });
    });

    it("should handle empty positions", async () => {
        // Arrange
        vi.mocked(prisma.position.findMany).mockResolvedValue([]);

        // Act
        const result = await getPortfolio({
            agentStrategyAssignmentId: mockAgentStrategyAssignmentId,
            publicKey: mockPublicKey,
        });

        // Assert
        expect(result.openPositions).toEqual([]);
        expect(result.walletPortfolioItems).toEqual(mockWalletPortfolioItems);
        expect(result.totalValue).toEqual(
            mockWalletPortfolioItems.reduce(
                (sum, item) => sum + item.valueUsd,
                0
            )
        );
    });

    it("should handle empty wallet portfolio", async () => {
        // Arrange
        vi.mocked(solanaModule.getWalletPortfolio).mockResolvedValue({
            success: true,
            data: {
                wallet: mockPublicKey,
                totalUsd: 0,
                items: [],
            },
        } as any);

        // Act
        const result = await getPortfolio({
            agentStrategyAssignmentId: mockAgentStrategyAssignmentId,
            publicKey: mockPublicKey,
        });

        // Assert
        // We're only checking the wallet portfolio items and total value
        // since the openPositions is already tested in other tests
        expect(result.walletPortfolioItems).toEqual([]);
        expect(result.totalValue).toEqual(0);
    });

    it("should throw an error when position query fails", async () => {
        // Arrange
        const mockError = new Error("Failed to fetch positions");
        vi.mocked(prisma.position.findMany).mockRejectedValue(mockError);

        // Act & Assert
        await expect(
            getPortfolio({
                agentStrategyAssignmentId: mockAgentStrategyAssignmentId,
                publicKey: mockPublicKey,
            })
        ).rejects.toThrow(mockError);
    });

    it("should throw an error when wallet portfolio query fails", async () => {
        // Arrange
        const mockError = new Error("Failed to fetch wallet portfolio");
        vi.mocked(solanaModule.getWalletPortfolio).mockRejectedValue(mockError);

        // Act & Assert
        await expect(
            getPortfolio({
                agentStrategyAssignmentId: mockAgentStrategyAssignmentId,
                publicKey: mockPublicKey,
            })
        ).rejects.toThrow(mockError);
    });
});
