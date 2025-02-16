import { TimeInterval } from "../types/birdeye/api/common";
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

export function getMillisecondsForTimeInterval(interval: TimeInterval): number {
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const week = 7 * day;
    const month = 30 * day; // Approximate

    switch (interval) {
        case "1m":
            return minute;
        case "3m":
            return 3 * minute;
        case "5m":
            return 5 * minute;
        case "15m":
            return 15 * minute;
        case "30m":
            return 30 * minute;
        case "1H":
        case "1h":
            return hour;
        case "2H":
        case "2h":
            return 2 * hour;
        case "4H":
        case "4h":
            return 4 * hour;
        case "6H":
        case "6h":
            return 6 * hour;
        case "8H":
        case "8h":
            return 8 * hour;
        case "12H":
        case "12h":
            return 12 * hour;
        case "24h":
        case "1D":
            return day;
        case "3D":
            return 3 * day;
        case "1W":
            return week;
        case "1M":
            return month;
        default:
            throw new Error(`Invalid time interval: ${interval}`);
    }
}
