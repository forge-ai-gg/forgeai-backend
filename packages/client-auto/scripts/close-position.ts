import { elizaLogger } from "@elizaos/core";
import { Position, PrismaClient } from "@prisma/client";
import { Connection } from "@solana/web3.js";
import dotenv from "dotenv";
import { SolanaAgentKit } from "solana-agent-kit";
import { EnumPositionStatus } from "../src/lib/enums";
import { getSwapDetails } from "../src/lib/solana.utils";
import { recordSuccessfulTrade } from "../src/trading/database-service";
import { executeTransaction } from "../src/trading/transaction-service";

// Load environment variables
dotenv.config();

// Constants
const AGENT_ID = "686cd021-3602-0a1d-99c9-aea779450b32";
const STRATEGY_ASSIGNMENT_ID = "de857c82-4a20-032d-b4e5-d7356a4a32c3";
const DUMMY_TRANSACTION_HASH =
    "0000000000000000000000000000000000000000000000000000000000000000";

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Main function to close a position
 */
async function main() {
    try {
        console.log(
            `Closing position for agent ${AGENT_ID} with strategy assignment ${STRATEGY_ASSIGNMENT_ID}`
        );

        // Find the open position
        const position = await findOpenPosition();

        if (!position) {
            console.error(
                "No open position found for the specified agent and strategy assignment"
            );
            return;
        }

        console.log(`Found open position: ${position.id}`);
        console.log(
            `Token pair: ${position.baseTokenSymbol}/${position.quoteTokenSymbol}`
        );

        // Create a trade decision
        const tradeDecision = createTradeDecision(position);

        // Create a trading context
        const tradingContext = await createTradingContext();

        // Execute the close position
        console.log("Executing close position transaction...");
        const result = await closePosition(
            tradingContext,
            tradeDecision,
            position
        );

        if (result.success) {
            console.log(`Successfully closed position ${position.id}`);
            if (result.transaction) {
                console.log(
                    `Transaction ID: ${result.transaction.transactionHash}`
                );
            }
            if (result.position) {
                console.log(`Position status: ${result.position.status}`);
                console.log(`Realized PnL: $${result.position.realizedPnlUsd}`);
            }
        } else {
            console.error("Failed to close position:", result.error);
        }
    } catch (error) {
        console.error("Error closing position:", error);
    } finally {
        await prisma.$disconnect();
    }
}

/**
 * Find the open position for the specified agent and strategy assignment
 */
async function findOpenPosition(): Promise<Position | null> {
    return prisma.position.findFirst({
        where: {
            strategyAssignmentId: STRATEGY_ASSIGNMENT_ID,
            status: "open",
            AgentStrategyAssignment: {
                agentId: AGENT_ID,
            },
        },
    });
}

/**
 * Create a trade decision for closing the position
 */
function createTradeDecision(position: Position) {
    // Create token objects from position data
    const baseToken = {
        address: position.baseTokenAddress,
        symbol: position.baseTokenSymbol,
        decimals: position.baseTokenDecimals,
        logoURI: position.baseTokenLogoURI || "",
        price: { value: position.entryPrice || 0 },
    };

    const quoteToken = {
        address: position.quoteTokenAddress,
        symbol: position.quoteTokenSymbol,
        decimals: position.quoteTokenDecimals,
        logoURI: position.quoteTokenLogoURI || "",
        price: { value: position.entryPrice || 0 },
    };

    // For a close position, we're selling the base token to get the quote token back
    return {
        shouldOpen: false,
        shouldClose: true,
        amount: parseFloat(position.totalBaseAmount),
        description: "Manual close position via script",
        tokenPair: {
            from: baseToken, // Selling the base token
            to: quoteToken, // To get quote token
        },
        strategyAssignmentId: position.strategyAssignmentId,
        position: position,
    };
}

/**
 * Create a trading context with necessary components
 */
async function createTradingContext() {
    // Get the agent's wallet
    const agentWallet = await prisma.wallet.findFirst({
        where: {
            agentId: AGENT_ID,
        },
    });

    if (!agentWallet) {
        throw new Error(`No wallet found for agent ${AGENT_ID}`);
    }

    // Create Solana connection
    const connection = new Connection(
        process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
        "confirmed"
    );

    // Create Solana agent
    const solanaAgent = new SolanaAgentKit(
        agentWallet.privateKey,
        process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
        {
            OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        }
    );

    return {
        agentId: AGENT_ID,
        solanaAgent,
        isPaperTrading: false, // Set to true if you want to simulate without actual transactions
        connection,
    };
}

/**
 * Execute the close position transaction
 */
async function closePosition(tradingContext, tradeDecision, position) {
    try {
        // Execute the transaction (or get dummy hash if paper trading)
        const txHash = tradingContext.isPaperTrading
            ? DUMMY_TRANSACTION_HASH
            : await executeTransaction(tradingContext, tradeDecision);

        console.log(`Transaction hash: ${txHash}`);

        // Get swap details
        const swapDetails = await getSwapDetails({
            connection: tradingContext.solanaAgent.connection,
            txHash,
            isPaperTrading: tradingContext.isPaperTrading,
            amountToTrade: tradeDecision.amount,
            tokenTo: tradeDecision.tokenPair.to,
            tokenFrom: tradeDecision.tokenPair.from,
        });

        // Current market prices (in a real scenario, you'd get these from an oracle)
        const tokenFromPrice = position.entryPrice || 1;
        const tokenToPrice = position.entryPrice || 1;

        // Record the successful trade
        const result = await recordSuccessfulTrade({
            decision: tradeDecision,
            txHash,
            swapDetails,
            tokenFromPrice,
            tokenToPrice,
            currentPosition: position,
        });

        return {
            success: true,
            transaction: result.transaction,
            position: result.position,
        };
    } catch (error) {
        elizaLogger.error("Error closing position:", error);

        // If there's an error, manually update the position status
        if (!tradingContext.isPaperTrading) {
            console.log(
                "Transaction failed, manually updating position status..."
            );
            try {
                const updatedPosition = await prisma.position.update({
                    where: { id: position.id },
                    data: {
                        status: EnumPositionStatus.CLOSED,
                        closedAt: new Date(),
                        updatedAt: new Date(),
                    },
                });

                return {
                    success: false,
                    error,
                    position: updatedPosition,
                };
            } catch (dbError) {
                console.error("Failed to update position status:", dbError);
                return {
                    success: false,
                    error,
                };
            }
        }

        return {
            success: false,
            error,
        };
    }
}

// Run the script
main().catch(console.error);
