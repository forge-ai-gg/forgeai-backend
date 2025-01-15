import {
    IAgentRuntime,
    ModelClass,
    elizaLogger,
    generateMessageResponse,
} from "@elizaos/core";
import { getTokenOverview, getTrendingTokens } from "./birdeye-api";
import {
    cleanResponseText,
    createMemory,
    getRandomAction,
    getRandomInstruction,
} from "./utils";

export const trendingTokenThought = async (runtime: IAgentRuntime) => {
    elizaLogger.log("Running trendingTokenThought client...");

    const trendingTokens = await getTrendingTokens(runtime);

    // select a random trending token
    const randomToken =
        trendingTokens.data.tokens[
            Math.floor(Math.random() * trendingTokens.data.tokens.length)
        ];

    // get the token overview
    const overview = await getTokenOverview(runtime, randomToken.address);

    // generate a thought about what to do
    await createMemory(
        runtime,
        await generateTrendingTokenThought(
            runtime,
            getRandomAction(randomToken, overview),
            {
                token: randomToken,
                overview,
            }
        )
    );

    elizaLogger.log("logRandomThoughts: finished running");
};

export const generateTrendingTokenThought = async (
    runtime: IAgentRuntime,
    action: string,
    details?: any
): Promise<string> => {
    const prompt = getRandomInstruction(details?.token, details?.overview);
    const context = `# Task: Generate a character-driven thought or observation
Action: ${action}
${details ? `Details: ${JSON.stringify(details, null, 2)}` : ""}

${prompt.instruction}

Style guidelines:
${prompt.style}

IMPORTANT: Your response must be valid JSON. Do not include any newlines or special characters in the text field.
Respond with a single line of JSON in this exact format:
{"text": "your single-line response here"}`;

    try {
        const response = await generateMessageResponse({
            runtime,
            context,
            modelClass: ModelClass.SMALL,
        });

        console.log("response", JSON.stringify(response, null, 2));

        return cleanResponseText(
            response?.text || "Lost in thought at the moment"
        );
    } catch (error) {
        elizaLogger.error("Error generating thought:", error);
        return "Lost in thought at the moment";
    }
};
