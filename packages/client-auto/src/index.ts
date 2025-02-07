import { type Client, type IAgentRuntime, elizaLogger } from "@elizaos/core";
import { logRandomThoughts } from "./apollo/random-thoughts";

export class AutoClient {
    interval: NodeJS.Timeout;
    runtime: IAgentRuntime;

    constructor(runtime: IAgentRuntime) {
        this.runtime = runtime;

        elizaLogger.log(
            `character ${this.runtime.character.name.toUpperCase()} starting auto client...`
        );

        // Random stagger between 1-60 seconds
        const staggerMs = Math.floor(Math.random() * 60 * 1000);

        setTimeout(() => {
            // Run first run
            void logRandomThoughts(this.runtime);

            // start a loop that runs every hour
            this.interval = setInterval(
                async () => {
                    await logRandomThoughts(this.runtime);
                },
                60 * 1000 // 1 minute in milliseconds
            );
        }, staggerMs);
    }
}

export const AutoClientInterface: Client = {
    start: async (runtime: IAgentRuntime) => {
        const client = new AutoClient(runtime);
        elizaLogger.info("Auto Client started");
        return client;
    },
    stop: async (_runtime: IAgentRuntime) => {
        console.warn("Direct client does not support stopping yet");
    },
};

export default AutoClientInterface;
