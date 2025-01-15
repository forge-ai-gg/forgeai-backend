import { startAgents } from "@elizaos/agent";
import { elizaLogger } from "@elizaos/core";

startAgents().catch((error) => {
    elizaLogger.error("Unhandled error in startAgents:", error);
    process.exit(1);
});
