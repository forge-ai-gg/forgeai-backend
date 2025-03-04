import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { EnumPositionStatus } from "../src/lib/enums";

// Load environment variables
dotenv.config();

// Constants
const AGENT_ID = "686cd021-3602-0a1d-99c9-aea779450b32";
const STRATEGY_ASSIGNMENT_ID = "de857c82-4a20-032d-b4e5-d7356a4a32c3";

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Main function to create a test position
 */
async function main() {
    try {
        console.log(
            `Creating test position for agent ${AGENT_ID} with strategy assignment ${STRATEGY_ASSIGNMENT_ID}`
        );

        // Check if the agent and strategy assignment exist
        const assignment = await prisma.agentStrategyAssignment.findUnique({
            where: {
                id: STRATEGY_ASSIGNMENT_ID,
            },
            include: {
                Agent: true,
                AgentTradingStrategy: true,
            },
        });

        if (!assignment) {
            console.error(
                `Strategy assignment ${STRATEGY_ASSIGNMENT_ID} not found`
            );
            return;
        }

        if (assignment.agentId !== AGENT_ID) {
            console.error(
                `Strategy assignment ${STRATEGY_ASSIGNMENT_ID} does not belong to agent ${AGENT_ID}`
            );
            return;
        }

        console.log(`Found strategy assignment: ${assignment.id}`);
        console.log(`Agent: ${assignment.Agent.name || assignment.agentId}`);
        console.log(`Strategy ID: ${assignment.strategyId}`);

        // Check if there's already an open position
        const existingPosition = await prisma.position.findFirst({
            where: {
                strategyAssignmentId: STRATEGY_ASSIGNMENT_ID,
                status: "open",
            },
        });

        if (existingPosition) {
            console.log(
                `There's already an open position: ${existingPosition.id}`
            );
            console.log(
                `Token pair: ${existingPosition.baseTokenSymbol}/${existingPosition.quoteTokenSymbol}`
            );

            // Ask if we should close it and create a new one
            const shouldContinue = process.argv.includes("--force");
            if (!shouldContinue) {
                console.log(
                    "Use --force to close the existing position and create a new one"
                );
                return;
            }

            // Close the existing position
            console.log("Closing existing position...");
            await prisma.position.update({
                where: {
                    id: existingPosition.id,
                },
                data: {
                    status: EnumPositionStatus.CLOSED,
                    closedAt: new Date(),
                    updatedAt: new Date(),
                    exitPrice: existingPosition.entryPrice,
                    realizedPnlUsd: 0,
                },
            });

            console.log(`Closed position ${existingPosition.id}`);
        }

        // Create a new position
        const newPosition = await prisma.position.create({
            data: {
                strategyAssignmentId: STRATEGY_ASSIGNMENT_ID,
                status: EnumPositionStatus.OPEN,
                openedAt: new Date(),
                baseTokenAddress: "So11111111111111111111111111111111111111112", // SOL
                baseTokenSymbol: "SOL",
                baseTokenDecimals: 9,
                baseTokenLogoURI:
                    "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
                quoteTokenAddress:
                    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
                quoteTokenSymbol: "USDC",
                quoteTokenDecimals: 6,
                quoteTokenLogoURI:
                    "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
                entryPrice: 100.0, // SOL price in USD
                totalBaseAmount: "1000000000", // 1 SOL (with 9 decimals)
                averageEntryPrice: 100.0,
                side: "LONG",
                userId: assignment.createdById,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });

        console.log(`Created new position: ${newPosition.id}`);
        console.log(
            `Token pair: ${newPosition.baseTokenSymbol}/${newPosition.quoteTokenSymbol}`
        );
        console.log(`Entry price: $${newPosition.entryPrice}`);
        console.log(
            `Amount: ${
                parseInt(newPosition.totalBaseAmount) /
                Math.pow(10, newPosition.baseTokenDecimals)
            } ${newPosition.baseTokenSymbol}`
        );

        // Create a transaction record for this position
        const transaction = await prisma.transaction.create({
            data: {
                strategyAssignmentId: STRATEGY_ASSIGNMENT_ID,
                timestamp: new Date(),
                tokenFromAddress: newPosition.quoteTokenAddress,
                tokenFromSymbol: newPosition.quoteTokenSymbol,
                tokenFromAmount: "100000000", // 100 USDC (with 6 decimals)
                tokenFromDecimals: newPosition.quoteTokenDecimals,
                tokenFromLogoURI: newPosition.quoteTokenLogoURI,
                tokenFromPrice: 1.0, // USDC price in USD
                tokenToAddress: newPosition.baseTokenAddress,
                tokenToSymbol: newPosition.baseTokenSymbol,
                tokenToAmount: newPosition.totalBaseAmount,
                tokenToDecimals: newPosition.baseTokenDecimals,
                tokenToLogoURI: newPosition.baseTokenLogoURI,
                tokenToPrice: newPosition.entryPrice,
                feesInUsd: 0.5,
                status: "completed",
                type: "buy",
                side: "BUY",
                transactionHash: `dummy-tx-${Date.now()}`,
                userId: assignment.createdById,
                positionId: newPosition.id,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });

        console.log(`Created transaction record: ${transaction.id}`);
        console.log(`Transaction hash: ${transaction.transactionHash}`);

        console.log("Position created successfully!");
    } catch (error) {
        console.error("Error creating position:", error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
main().catch(console.error);
