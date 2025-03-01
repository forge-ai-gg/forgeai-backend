import { EnumPositionStatus } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { getPortfolio } from "@/trading/portfolio";
import * as solanaModule from "@/trading/solana";
import { WalletPortfolioItem } from "@/types/birdeye/api/wallet";
import { Position } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

    const mockPositions: Position[] = [
        {
            id: "position-1",
            strategyAssignmentId: mockAgentStrategyAssignmentId,
            status: EnumPositionStatus.OPEN,
            baseTokenAddress: "token-address-1",
            baseTokenSymbol: "TEST1",
            baseTokenDecimals: 9,
            baseTokenLogoURI: "test-logo-uri-1",
            quoteTokenAddress: "quote-token-address-1",
            quoteTokenSymbol: "USDC",
            quoteTokenDecimals: 6,
            quoteTokenLogoURI: "test-logo-uri-usdc",
            entryPrice: 1.5,
            exitPrice: null,
            totalBaseAmount: "100",
            averageEntryPrice: 1.5,
            realizedPnlUsd: null,
            totalFeesUsd: 0,
            side: "buy",
            metadata: {},
            openedAt: new Date(),
            closedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            userId: null,
        },
        {
            id: "position-2",
            strategyAssignmentId: mockAgentStrategyAssignmentId,
            status: EnumPositionStatus.OPEN,
            baseTokenAddress: "token-address-2",
            baseTokenSymbol: "TEST2",
            baseTokenDecimals: 6,
            baseTokenLogoURI: "test-logo-uri-2",
            quoteTokenAddress: "quote-token-address-1",
            quoteTokenSymbol: "USDC",
            quoteTokenDecimals: 6,
            quoteTokenLogoURI: "test-logo-uri-usdc",
            entryPrice: 3.0,
            exitPrice: null,
            totalBaseAmount: "50",
            averageEntryPrice: 3.0,
            realizedPnlUsd: null,
            totalFeesUsd: 0,
            side: "buy",
            metadata: {},
            openedAt: new Date(),
            closedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            userId: null,
        },
    ];

    const mockWalletPortfolioItems: WalletPortfolioItem[] = [
        {
            address: "token-address-1",
            symbol: "TEST1",
            name: "Test Token 1",
            decimals: 9,
            balance: "100000000000",
            uiAmount: 100,
            chainId: "solana",
            logoURI: "test-logo-uri-1",
            priceUsd: 2.0,
            valueUsd: 200,
        },
        {
            address: "token-address-2",
            symbol: "TEST2",
            name: "Test Token 2",
            decimals: 6,
            balance: "50000000",
            uiAmount: 50,
            chainId: "solana",
            logoURI: "test-logo-uri-2",
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
