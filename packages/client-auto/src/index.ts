import { type Client, type IAgentRuntime, elizaLogger } from "@elizaos/core";
import { update } from "./update";

// todo - add a config for this
const AGENT_AUTO_CLIENT_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds

export class AutoClient {
    interval: NodeJS.Timeout | null = null;
    runtime: IAgentRuntime;
    isIntervalEnabled = false;

    constructor(runtime: IAgentRuntime) {
        this.runtime = runtime;
        // this.runtime.clients["auto"] = this;

        elizaLogger.info(
            `AGENT: ${this.runtime.character.name} (${this.runtime.agentId}) starting auto client.....`
        );

        // Random stagger between 1-60 seconds
        // const staggerMs = Math.floor(Math.random() * 60 * 1000);
        const staggerMs = 0;

        // run the first update
        update(this.runtime);

        if (this.isIntervalEnabled) {
            setTimeout(() => {
                // start a loop that runs every hour
                this.interval = setInterval(
                    async () => {
                        await update(this.runtime);
                    },
                    60 * 1000 // 1 minute in milliseconds
                );
            }, staggerMs);
        }
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            elizaLogger.log(
                `character ${this.runtime.character.name.toUpperCase()} stopping auto client...`
            );
        }
    }
}

export const AutoClientInterface: Client = {
    start: async (runtime: IAgentRuntime) => {
        elizaLogger.info("STARTING AUTO CLIENT", runtime.agentId);
        const client = new AutoClient(runtime);
        elizaLogger.info("Auto Client started");
        return client;
    },
    stop: async (runtime: IAgentRuntime) => {
        console.warn("Auto client does not support stopping yet");
    },
};

export default AutoClientInterface;
