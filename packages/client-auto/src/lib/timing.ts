import { EnumUpdateInterval } from "./enums";

export const intervalMs = (updateInterval: EnumUpdateInterval) => {
    switch (updateInterval) {
        case EnumUpdateInterval.CONTINUOUS:
            return 60 * 1000; // 1 minute
        case EnumUpdateInterval.HOUR:
            return 60 * 60 * 1000; // 1 hour
        case EnumUpdateInterval.DAY:
            return 24 * 60 * 60 * 1000; // 24 hours
        default:
            return 60 * 1000; // default to 1 minute
    }
};
