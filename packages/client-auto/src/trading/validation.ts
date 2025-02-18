export interface ITradingLimits {
    minTradeAmountSol: number;
    maxPositionSizePercent: number;
    maxSlippagePercent: number;
    minLiquidityUsd: number;
    minDailyVolumeUsd: number;
    minTrustScore: number;
}

export const DEFAULT_TRADING_LIMITS: ITradingLimits = {
    minTradeAmountSol: 0.001,
    maxPositionSizePercent: 10,
    maxSlippagePercent: 3,
    minLiquidityUsd: 1000,
    minDailyVolumeUsd: 2000,
    minTrustScore: 0.4,
};

let tradingLimits: ITradingLimits = { ...DEFAULT_TRADING_LIMITS };

export const setTradingLimits = (customLimits: Partial<ITradingLimits>) => {
    tradingLimits = { ...DEFAULT_TRADING_LIMITS, ...customLimits };
};

export const validateTradeParameters = async (params: {
    amountInSol: number;
    tokenLiquidityUsd: number;
    tokenDailyVolumeUsd: number;
    expectedSlippage: number;
    trustScore?: number;
}): Promise<{ isValid: boolean; reason?: string }> => {
    const {
        amountInSol,
        tokenLiquidityUsd,
        tokenDailyVolumeUsd,
        expectedSlippage,
        trustScore,
    } = params;

    if (amountInSol < tradingLimits.minTradeAmountSol) {
        return {
            isValid: false,
            reason: `Trade amount (${amountInSol} SOL) below minimum (${tradingLimits.minTradeAmountSol} SOL)`,
        };
    }

    if (tokenLiquidityUsd < tradingLimits.minLiquidityUsd) {
        return {
            isValid: false,
            reason: `Token liquidity ($${tokenLiquidityUsd}) below minimum ($${tradingLimits.minLiquidityUsd})`,
        };
    }

    if (tokenDailyVolumeUsd < tradingLimits.minDailyVolumeUsd) {
        return {
            isValid: false,
            reason: `24h volume ($${tokenDailyVolumeUsd}) below minimum ($${tradingLimits.minDailyVolumeUsd})`,
        };
    }

    if (expectedSlippage > tradingLimits.maxSlippagePercent) {
        return {
            isValid: false,
            reason: `Expected slippage (${expectedSlippage}%) above maximum (${tradingLimits.maxSlippagePercent}%)`,
        };
    }

    if (trustScore !== undefined && trustScore < tradingLimits.minTrustScore) {
        return {
            isValid: false,
            reason: `Trust score (${trustScore}) below minimum (${tradingLimits.minTrustScore})`,
        };
    }

    return { isValid: true };
};

export const validatePositionSize = async (params: {
    amountUsd: number;
    tokenLiquidityUsd: number;
}): Promise<{ isValid: boolean; reason?: string }> => {
    const { amountUsd, tokenLiquidityUsd } = params;
    const positionSizePercent = (amountUsd / tokenLiquidityUsd) * 100;

    if (positionSizePercent > tradingLimits.maxPositionSizePercent) {
        return {
            isValid: false,
            reason: `Position size (${positionSizePercent.toFixed(
                2
            )}%) above maximum (${tradingLimits.maxPositionSizePercent}%)`,
        };
    }

    return { isValid: true };
};

export const getTradingLimits = (): ITradingLimits => {
    return tradingLimits;
};
