export enum EnumUpdateInterval {
    CONTINUOUS = "continuous",
    MINUTE = "minute",
    HOUR = "hour",
    DAY = "day",
}

export enum EnumTradeStatus {
    OPEN = "open",
    CLOSED = "closed",
    PENDING = "pending",
    FAILED = "failed",
}

export enum EnumTradeType {
    BUY = "buy",
    SELL = "sell",
}

export enum EnumMemoryType {
    TRADE = "trade",
    ERROR = "error",
    IDLE = "idle",
}

export enum EnumPositionStatus {
    OPEN = "open",
    CLOSED = "closed",
}

export enum EnumStrategyType {
    RSI = "rsi",
}

export enum SolanaChainId {
    MAINNET = 101,
    DEVNET = 103,
    TESTNET = 102,
}
