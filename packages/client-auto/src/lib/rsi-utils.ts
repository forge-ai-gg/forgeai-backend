import { elizaLogger } from "@elizaos/core";

/**
 * Calculates how close the current RSI is to triggering the next trading action
 * For open positions: measures proximity to overbought (sell threshold)
 * For no positions: measures proximity to oversold (buy threshold)
 * Returns a percentage from 0-100
 */
export const calculateProximityToThreshold = (
    currentRsi: number,
    hasOpenPosition: boolean,
    overBought: number,
    overSold: number
): number => {
    if (hasOpenPosition) {
        // For open positions, measure distance to overbought (sell threshold)
        const distance = overBought - currentRsi;
        const range = overBought - overSold;
        const proximity = Math.max(
            0,
            Math.min(100, (1 - distance / range) * 100)
        );
        return proximity;
    } else {
        // For no positions, measure distance to oversold (buy threshold)
        const distance = currentRsi - overSold;
        const range = overBought - overSold;
        const proximity = Math.max(
            0,
            Math.min(100, (1 - distance / range) * 100)
        );
        elizaLogger.info("Buy proximity calculation:", {
            currentRsi,
            overSold,
            distance,
            range,
            proximity,
        });
        return proximity;
    }
};
