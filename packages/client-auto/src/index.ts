import { type Client, elizaLogger } from "@elizaos/core";
import { EnumUpdateInterval } from "./lib/enums";
import { intervalMs } from "./lib/timing";
import { IAgentRuntimeExtended } from "./types/eliza";
import { update } from "./update";

const DEFAULT_UPDATE_INTERVAL = EnumUpdateInterval.MINUTE;

export class AutoClient {
    interval: NodeJS.Timeout | null = null;
    runtime: IAgentRuntimeExtended;
    isIntervalEnabled = true;
    updateCycle = 0;
    isStopped = false;

    constructor(runtime: IAgentRuntimeExtended) {
        this.runtime = runtime;
        const updateInterval =
            this.runtime.character.settings.updateInterval ||
            DEFAULT_UPDATE_INTERVAL;

        elizaLogger.info(
            `AGENT: ${this.runtime.character.name} (${this.runtime.agentId}) starting auto client.....`
        );

        // Start the update cycle
        this.updateCycle++;
        this.runUpdate(updateInterval);
    }

    private async runUpdate(updateInterval: EnumUpdateInterval) {
        if (this.isStopped) return;

        await update(this.runtime, this.updateCycle);

        if (this.isStopped) return;

        if (updateInterval === EnumUpdateInterval.CONTINUOUS) {
            // Schedule next update immediately but allow event loop to clear
            setTimeout(() => {
                this.updateCycle++;
                this.runUpdate(updateInterval);
            }, 0);
        } else if (this.isIntervalEnabled) {
            // Schedule next update based on interval
            this.interval = setTimeout(() => {
                this.updateCycle++;
                this.runUpdate(updateInterval);
            }, intervalMs(updateInterval));
        }
    }

    stop() {
        this.isStopped = true;
        if (this.interval) {
            clearTimeout(this.interval);
            this.interval = null;
            elizaLogger.log(
                `character ${this.runtime.character.name.toUpperCase()} stopping auto client...`
            );
        }
    }
}

export const AutoClientInterface: Client = {
    start: async (runtime: IAgentRuntimeExtended) => {
        const client = new AutoClient(runtime);
        return client;
    },
    stop: async (runtime: IAgentRuntimeExtended) => {
        console.warn("Auto client does not support stopping yet");
    },
};

export default AutoClientInterface;
