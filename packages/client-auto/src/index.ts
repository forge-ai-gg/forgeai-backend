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

        // Random stagger between 1-3 minutes
        const staggerMs =
            Math.floor(Math.random() * (3 - 1 + 1) + 1) * 60 * 1000;

        setTimeout(() => {
            // Run first run
            void logRandomThoughts(this.runtime);

            // start a loop that runs every hour
            this.interval = setInterval(
                async () => {
                    await logRandomThoughts(this.runtime);
                },
                60 * 60 * 1000 // 1 hour in milliseconds
            );
        }, staggerMs);
    }
}

export const AutoClientInterface: Client = {
    start: async (runtime: IAgentRuntime) => {
        const client = new AutoClient(runtime);
        return client;
    },
    stop: async (_runtime: IAgentRuntime) => {
        console.warn("Direct client does not support stopping yet");
    },
};

export default AutoClientInterface;
