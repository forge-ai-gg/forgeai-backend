import { bool, cleanEnv, str } from "envalid";

const config = cleanEnv(process.env, {
    ANTHROPIC_API_KEY: str({
        desc: "Anthropic API Key",
    }),
    AWS_KMS_ACCESS_KEY_ID: str({
        desc: "AWS KMS Access Key ID",
    }),
    AWS_KMS_ACCESS_KEY_SECRET: str({
        desc: "AWS KMS Secret Access Key",
    }),
    AWS_KMS_KEY_ID: str({
        desc: "AWS KMS Key ID",
    }),
    AWS_KMS_REGION: str({
        desc: "AWS KMS Region",
    }),
    BIRDEYE_API_KEY: str({
        desc: "Birdeye API Key",
    }),
    LOAD_AGENTS_FROM_DB: bool({
        desc: "Load agents from DB",
        default: false,
    }),
    OPENAI_API_KEY: str({
        desc: "OpenAI API Key",
    }),
    POSTGRES_URL: str({
        desc: "PostgreSQL URL",
    }),
    POSTGRES_URL_NON_POOLING: str({
        desc: "PostgreSQL URL (non-pooling)",
    }),
    SOLANA_CHAIN_ID: str({
        desc: "Solana Chain ID",
        default: "mainnet",
    }),
    SOLANA_PRIVATE_KEY: str({
        desc: "Solana Private Key",
    }),
    SOLANA_RPC_URL: str({
        desc: "Solana RPC URL",
    }),
    USE_OPENAI_EMBEDDING: bool({
        desc: "Use OpenAI Embedding",
        default: false,
    }),
    WALLET_PUBLIC_KEY: str({
        desc: "Wallet Public Key",
    }),
});

export { config };
