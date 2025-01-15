// Re-export all API types
export * from "./api/common";
export * from "./api/defi";
export * from "./api/pair";
export * from "./api/search";
export * from "./api/token";
export * from "./api/trader";
export * from "./api/wallet";

// Re-export shared types
export * from "./shared";

// Export local types
import { BIRDEYE_SUPPORTED_CHAINS } from "../utils";
export type BirdeyeSupportedChain = (typeof BIRDEYE_SUPPORTED_CHAINS)[number];

export interface BaseAddress {
    type?: "wallet" | "token" | "contract";
    symbol?: string;
    address: string;
    chain: BirdeyeSupportedChain;
}

export interface WalletAddress extends BaseAddress {
    type: "wallet";
}

export interface TokenAddress extends BaseAddress {
    type: "token";
}

export interface ContractAddress extends BaseAddress {
    type: "contract";
}
