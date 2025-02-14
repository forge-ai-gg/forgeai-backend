import {
    DecryptCommand,
    GenerateDataKeyCommand,
    GetKeyRotationStatusCommand,
    KMSClient,
} from "@aws-sdk/client-kms";
import crypto, { createCipheriv, createDecipheriv } from "crypto";

const kmsClient = new KMSClient({
    region: process.env.AWS_KMS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_KMS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_KMS_ACCESS_KEY_SECRET,
    },
});

export async function getKmsKeyRotationStatus() {
    try {
        const command = new GetKeyRotationStatusCommand({
            KeyId: process.env.AWS_KMS_KEY_ID,
        });
        const response = await kmsClient.send(command);

        // eslint-disable-next-line no-console
        console.log(response);

        return response.KeyRotationEnabled;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error getting KMS key rotation status:", error);
        throw error;
    }
}

export async function encrypt(data: string) {
    console.log("[KMS Encrypt] Starting encryption");
    const dataKeyResponse = await kmsClient.send(
        new GenerateDataKeyCommand({
            KeyId: process.env.AWS_KMS_KEY_ID,
            KeySpec: "AES_256",
        })
    );
    console.log("[KMS Encrypt] Generated data key");

    const iv = Buffer.alloc(16);
    crypto.randomFillSync(iv);
    console.log("[KMS Encrypt] Generated IV");

    const cipher = createCipheriv(
        "aes-256-cbc",
        dataKeyResponse.Plaintext as Buffer,
        iv
    );

    const encrypted = Buffer.concat([
        cipher.update(Buffer.from(data)),
        cipher.final(),
    ]);
    console.log("[KMS Encrypt] Data encrypted, length:", encrypted.length);

    const encryptedDataKey = dataKeyResponse.CiphertextBlob as Buffer;
    const result = Buffer.concat([
        Buffer.from([encryptedDataKey.length]),
        encryptedDataKey,
        iv,
        encrypted,
    ]).toString("base64");

    console.log("[KMS Encrypt] Completed", {
        encryptedDataKeyLength: encryptedDataKey.length,
        ivLength: iv.length,
        encryptedDataLength: encrypted.length,
        totalLength: result.length,
    });

    return result;
}

export async function decrypt(encryptedData: string) {
    console.log("[KMS Decrypt] Starting decryption");
    const buffer = Buffer.from(encryptedData, "base64");
    console.log("[KMS Decrypt] Input length:", buffer.length);

    const dataKeyLength = buffer[0];
    console.log("[KMS Decrypt] Data key length:", dataKeyLength);

    const encryptedDataKey = buffer.subarray(1, dataKeyLength + 1);
    const iv = buffer.subarray(dataKeyLength + 1, dataKeyLength + 17);
    const encrypted = buffer.subarray(dataKeyLength + 17);

    console.log("[KMS Decrypt] Parsed components", {
        encryptedDataKeyLength: encryptedDataKey.length,
        ivLength: iv.length,
        encryptedDataLength: encrypted.length,
    });

    const dataKeyResponse = await kmsClient.send(
        new DecryptCommand({
            CiphertextBlob: encryptedDataKey,
        })
    );
    console.log("[KMS Decrypt] Decrypted data key");

    const decipher = createDecipheriv(
        "aes-256-cbc",
        dataKeyResponse.Plaintext as Buffer,
        iv
    );

    const result = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
    ]).toString();

    console.log("[KMS Decrypt] Completed, decrypted length:", result.length);
    return result;
}
