import { IAgentRuntime } from "@elizaos/core";
import bs58 from "bs58";
import { decrypt } from "./aws-kms";

export type AgentWalletDetails = {
    publicKey: string;
    privateKey: string;
};

export async function getAgentWalletDetails({
    runtime,
    cycle,
}: {
    runtime: IAgentRuntime;
    cycle: number;
}): Promise<AgentWalletDetails> {
    const privateKeyBase64 = await decrypt(
        runtime.character.settings.secrets.SOLANA_PRIVATE_KEY
    );
    const privateKeyBytes = Buffer.from(privateKeyBase64, "base64");
    const privateKey = bs58.encode(privateKeyBytes);
    const publicKey =
        runtime.character.settings.secrets.SOLANA_WALLET_PUBLIC_KEY;

    return {
        publicKey,
        privateKey,
    };
}
