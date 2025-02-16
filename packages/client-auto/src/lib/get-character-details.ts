import { elizaLogger, IAgentRuntime } from "@elizaos/core";
import { AgentStrategyAssignment } from "@prisma/client";
import bs58 from "bs58";
import { decrypt } from "./aws-kms";
import { prisma } from "./prisma";

export const getCharacterDetails = async ({
    runtime,
    cycle,
}: {
    runtime: IAgentRuntime;
    cycle: number;
}): Promise<{
    privateKey: string;
    publicKey: string;
    tradingStrategyAssignment: AgentStrategyAssignment;
}> => {
    // get private key
    const privateKeyBase64 = await decrypt(
        runtime.character.settings.secrets.SOLANA_PRIVATE_KEY
    );
    const privateKeyBytes = Buffer.from(privateKeyBase64, "base64");
    const privateKey = bs58.encode(privateKeyBytes);

    // get public key
    const publicKey =
        runtime.character.settings.secrets.SOLANA_WALLET_PUBLIC_KEY;

    const shortId = runtime.character.id.slice(0, 4);

    elizaLogger.info(
        `Running auto update cycle #${cycle} for ${runtime.character.name} (${shortId}) Public Key: ${publicKey}...`
    );

    // get trading stra I hear a timer 10 more minutes 10 more minutes OKtegy assignments
    const tradingStrategyAssignment =
        await prisma.agentStrategyAssignment.findFirst({
            where: {
                agentId: runtime.character.id,
                isActive: true,
            },
            include: {
                AgentTradingStrategy: true,
            },
        });

    return {
        privateKey,
        publicKey,
        tradingStrategyAssignment,
    };
};
