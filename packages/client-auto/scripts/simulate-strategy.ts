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
 * Main function to simulate a trading strategy evaluation
 */
async function main() {
    try {
        console.log(
            `Simulating strategy evaluation for agent ${AGENT_ID} with strategy assignment ${STRATEGY_ASSIGNMENT_ID}`
        );

        // Get the strategy assignment
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

        // Get the agent's wallet
        const agentWallet = await prisma.wallet.findFirst({
            where: {
                agentId: AGENT_ID,
            },
        });

        if (!agentWallet) {
            console.error(`No wallet found for agent ${AGENT_ID}`);
            return;
        }

        // Get open positions for this strategy assignment
        const openPositions = await prisma.position.findMany({
            where: {
                strategyAssignmentId: STRATEGY_ASSIGNMENT_ID,
                status: EnumPositionStatus.OPEN,
            },
        });

        console.log(
            `Found ${openPositions.length} open positions for this strategy assignment`
        );

        // Create a mock trade decision
        const mockDecision = {
            shouldOpen: openPositions.length === 0, // Open if no positions, close if positions exist
            shouldClose: openPositions.length > 0,
            amount: 100, // 100 USD
            description:
                openPositions.length === 0
                    ? "RSI is below oversold threshold (30), indicating a potential buy opportunity."
                    : "RSI is above overbought threshold (70), indicating a potential sell opportunity.",
            tokenPair: {
                from: {
                    address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
                    symbol: "USDC",
                    decimals: 6,
                    logoURI:
                        "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
                    network: "solana",
                    price: { value: 1.0 },
                },
                to: {
                    address: "So11111111111111111111111111111111111111112", // SOL
                    symbol: "SOL",
                    decimals: 9,
                    logoURI:
                        "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
                    network: "solana",
                    price: { value: 100.0 },
                },
            },
            strategyAssignmentId: STRATEGY_ASSIGNMENT_ID,
            position: openPositions.length > 0 ? openPositions[0] : undefined,
        };

        // Display the results
        console.log("\nStrategy Evaluation Results:");
        console.log("---------------------------");
        console.log(`Strategy Type: ${assignment.AgentTradingStrategy.class}`);
        console.log(
            `Token Pair: ${mockDecision.tokenPair.from.symbol}/${mockDecision.tokenPair.to.symbol}`
        );
        console.log("\nDecision:");
        console.log(
            `Action: ${
                mockDecision.shouldOpen
                    ? "OPEN"
                    : mockDecision.shouldClose
                    ? "CLOSE"
                    : "HOLD"
            }`
        );
        console.log(`Description: ${mockDecision.description}`);
        console.log(`Amount: $${mockDecision.amount}`);

        if (mockDecision.position) {
            console.log("\nPosition to close:");
            console.log(`Position ID: ${mockDecision.position.id}`);
            console.log(`Entry Price: $${mockDecision.position.entryPrice}`);
            console.log(
                `Current Price: $${mockDecision.position.averageEntryPrice}`
            );
            console.log(
                `Amount: ${
                    parseInt(mockDecision.position.totalBaseAmount) /
                    Math.pow(10, mockDecision.position.baseTokenDecimals)
                } ${mockDecision.position.baseTokenSymbol}`
            );
        }

        // Ask if we should execute this trade decision
        console.log("\nTo execute this trade decision, run:");
        if (mockDecision.shouldOpen) {
            console.log("pnpm create-position");
        } else if (mockDecision.shouldClose) {
            console.log("pnpm close-position");
        }

        console.log("\nSimulation completed successfully!");
    } catch (error) {
        console.error("Error simulating strategy:", error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
main().catch(console.error);
