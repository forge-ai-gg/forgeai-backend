import { Character, IAgentRuntime } from "@elizaos/core";
import { EnumUpdateInterval } from "../lib/enums";

export interface IAgentRuntimeExtended extends IAgentRuntime {
    character: Character & {
        settings: IAgentRuntime["character"]["settings"] & {
            updateInterval: EnumUpdateInterval;
        };
    };
}
