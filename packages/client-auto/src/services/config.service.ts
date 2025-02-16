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

export class ConfigService {
    private tradingLimits: ITradingLimits;

    constructor(customLimits?: Partial<ITradingLimits>) {
        this.tradingLimits = { ...DEFAULT_TRADING_LIMITS, ...customLimits };
    }

    async validateTradeParameters(params: {
        amountInSol: number;
        tokenLiquidityUsd: number;
        tokenDailyVolumeUsd: number;
        expectedSlippage: number;
        trustScore?: number;
    }): Promise<{ isValid: boolean; reason?: string }> {
        const {
            amountInSol,
            tokenLiquidityUsd,
            tokenDailyVolumeUsd,
            expectedSlippage,
            trustScore,
        } = params;

        // Check minimum trade amount
        if (amountInSol < this.tradingLimits.minTradeAmountSol) {
            return {
                isValid: false,
                reason: `Trade amount (${amountInSol} SOL) below minimum (${this.tradingLimits.minTradeAmountSol} SOL)`,
            };
        }

        // Check liquidity
        if (tokenLiquidityUsd < this.tradingLimits.minLiquidityUsd) {
            return {
                isValid: false,
                reason: `Token liquidity ($${tokenLiquidityUsd}) below minimum ($${this.tradingLimits.minLiquidityUsd})`,
            };
        }

        // Check daily volume
        if (tokenDailyVolumeUsd < this.tradingLimits.minDailyVolumeUsd) {
            return {
                isValid: false,
                reason: `24h volume ($${tokenDailyVolumeUsd}) below minimum ($${this.tradingLimits.minDailyVolumeUsd})`,
            };
        }

        // Check slippage
        if (expectedSlippage > this.tradingLimits.maxSlippagePercent) {
            return {
                isValid: false,
                reason: `Expected slippage (${expectedSlippage}%) above maximum (${this.tradingLimits.maxSlippagePercent}%)`,
            };
        }

        // Check trust score if available
        if (
            trustScore !== undefined &&
            trustScore < this.tradingLimits.minTrustScore
        ) {
            return {
                isValid: false,
                reason: `Trust score (${trustScore}) below minimum (${this.tradingLimits.minTrustScore})`,
            };
        }

        return { isValid: true };
    }

    async validatePositionSize(params: {
        amountUsd: number;
        tokenLiquidityUsd: number;
    }): Promise<{ isValid: boolean; reason?: string }> {
        const { amountUsd, tokenLiquidityUsd } = params;
        const positionSizePercent = (amountUsd / tokenLiquidityUsd) * 100;

        if (positionSizePercent > this.tradingLimits.maxPositionSizePercent) {
            return {
                isValid: false,
                reason: `Position size (${positionSizePercent.toFixed(
                    2
                )}%) above maximum (${
                    this.tradingLimits.maxPositionSizePercent
                }%)`,
            };
        }

        return { isValid: true };
    }

    getTradingLimits(): ITradingLimits {
        return this.tradingLimits;
    }
}
