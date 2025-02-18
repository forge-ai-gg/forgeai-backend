export const tokenAddresses = {
    SOL: "So11111111111111111111111111111111111111112",
    USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    JUP: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
} as const;

export const JUPITER_PROGRAM_ID = "JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB";

// Configuration flags for trading behavior
export const FORCE_TRADE = true; // Forces trade execution regardless of conditions
export const FORCE_PAPER_TRADING = false; // Forces paper trading mode when true
export const FORCE_LIVE_TRADING = false; // Forces live trading mode when true
export const FORCE_OPEN_POSITION = true; // Forces open position when true
export const FORCE_CLOSE_POSITION = false; // Forces close position when true
