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
    const dataKeyResponse = await kmsClient.send(
        new GenerateDataKeyCommand({
            KeyId: process.env.AWS_KMS_KEY_ID,
            KeySpec: "AES_256",
        })
    );

    // Generate a random IV instead of fixed zeros
    const iv = Buffer.alloc(16);
    crypto.randomFillSync(iv);

    const cipher = createCipheriv(
        "aes-256-cbc", // Changed to CBC mode which is better for large data
        dataKeyResponse.Plaintext as Buffer,
        iv
    );

    const encrypted = Buffer.concat([
        cipher.update(Buffer.from(data)),
        cipher.final(),
    ]);

    // Combine encrypted data key, IV, and encrypted content
    const encryptedDataKey = dataKeyResponse.CiphertextBlob as Buffer;
    return Buffer.concat([
        Buffer.from([encryptedDataKey.length]), // 1 byte for length
        encryptedDataKey,
        iv,
        encrypted,
    ]).toString("base64");
}

export async function decrypt(encryptedData: string) {
    const buffer = Buffer.from(encryptedData, "base64");

    // Read the encrypted data key length from first byte
    const dataKeyLength = buffer[0];

    // Extract the parts
    const encryptedDataKey = buffer.subarray(1, dataKeyLength + 1);
    const iv = buffer.subarray(dataKeyLength + 1, dataKeyLength + 17);
    const encrypted = buffer.subarray(dataKeyLength + 17);

    const dataKeyResponse = await kmsClient.send(
        new DecryptCommand({
            CiphertextBlob: encryptedDataKey,
        })
    );

    const decipher = createDecipheriv(
        "aes-256-cbc", // Changed to CBC mode
        dataKeyResponse.Plaintext as Buffer,
        iv
    );

    return Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
    ]).toString();
}
