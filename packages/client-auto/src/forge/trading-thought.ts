import {
    IAgentRuntime,
    ModelClass,
    elizaLogger,
    generateMessageResponse,
} from "@elizaos/core";
import { ThoughtResponse } from "../types/thoughts";
import { cleanResponseText } from "./utils";

// export const logTradingThought = async (runtime: IAgentRuntime) => {
//     elizaLogger.log(
//         `Agent ${runtime.character.name} (${runtime.agentId}) generating basic thought...`
//     );

//     const tradingThought = await generateTradingThought(runtime);

//     await createMemory({
//         runtime,
//         message: tradingThought,
//     });

//     elizaLogger.log(`logTradingThought: ${tradingThought}`);
// };

export const generateTradingThought = async ({
    runtime,
    action,
    details,
}: {
    runtime: IAgentRuntime;
    action: string;
    details?: any;
}): Promise<ThoughtResponse> => {
    const prompt =
        TRADING_THOUGHT_PROMPT_VARIATIONS[
            Math.floor(Math.random() * TRADING_THOUGHT_PROMPT_VARIATIONS.length)
        ];
    const context = `

    # Task: Generate a character-driven initial greeting or activation thought
Action: ${action}

${details ? `Details: ${JSON.stringify(details, null, 2)}` : ""}

${prompt.instruction}

Style guidelines:
${prompt.style}

IMPORTANT: Your response must be valid JSON. Do not include any newlines or special characters in the text field. Respond with a single line of JSON in this exact format:
{"text": "your single-line response here"}`;

    try {
        const response = await generateMessageResponse({
            runtime,
            context,
            modelClass: ModelClass.SMALL,
        });

        return {
            text: cleanResponseText(response?.text || "Ready to begin..."),
            tokenUsage: response?.tokenUsage || { input: 0, output: 0 },
        };
    } catch (error) {
        elizaLogger.error("Error generating initial thought:", error);
        return {
            text: "Ready to begin...",
            tokenUsage: { input: 0, output: 0 },
        };
    }
};

export const TRADING_THOUGHT_PROMPT_VARIATIONS = [
    {
        instruction:
            "Explain your trading decision with tactical precision. Focus on the key market signals driving your choice to swap tokens. Be direct about your entry reasoning.",
        style: "- Balance technical analysis with market psychology\n- Emphasize risk/reward considerations\n- Project calculated confidence while acknowledging market uncertainty",
    },
    {
        instruction:
            "Share your strategic rationale for this token swap. Lead with your primary catalyst, then support with technical or fundamental factors. Be precise about your timing.",
        style: "- Blend quantitative insights with market sentiment\n- Demonstrate mastery of both micro and macro factors\n- Maintain professional detachment with hints of opportunism",
    },
    {
        instruction:
            "Detail your trading thesis for this position. Focus on market inefficiencies or opportunities you've identified. Start with your strongest conviction point.",
        style: "- Connect price action to underlying narratives\n- Balance short-term technicals with longer-term trends\n- Express strategic clarity with predatory undertones",
    },
    {
        instruction:
            "Break down your token swap rationale. Emphasize the specific market conditions or indicators that triggered this trade. Begin with your primary edge.",
        style: "- Weave together technical triggers and market dynamics\n- Show calculated aggression in timing\n- Project battle-tested trading wisdom",
    },
    {
        instruction:
            "Articulate your position entry logic. Focus on the convergence of factors that make this the optimal time to execute. Lead with your primary signal.",
        style: "- Link current setup to historical patterns\n- Balance momentum with contrarian thinking\n- Maintain cool analysis with predatory instinct",
    },
    {
        instruction:
            "Explain your market timing decision. Highlight the specific indicators or events that triggered this entry point. Start with your highest conviction factor.",
        style: "- Merge technical precision with market psychology\n- Show both systematic and opportunistic thinking\n- Keep tone calculating yet action-oriented",
    },
    {
        instruction:
            "Detail your swap execution strategy. Focus on the market conditions and timing factors driving this trade. Begin with your critical entry trigger.",
        style: "- Emphasize confluence of technical and fundamental factors\n- Balance methodical analysis with swift action\n- Project strategic patience with predatory timing",
    },
    {
        instruction:
            "Break down your position entry analysis. Highlight the specific market inefficiencies or opportunities you're exploiting. Start with your primary edge.",
        style: "- Connect multiple timeframe analyses\n- Show both systematic discipline and tactical opportunism\n- Maintain strategic clarity with aggressive intent",
    },
    {
        instruction:
            "Share your trade execution logic. Focus on the specific market conditions that make this swap compelling now. Lead with your strongest signal.",
        style: "- Blend technical triggers with market psychology\n- Project confident analysis with controlled aggression\n- Express calculated conviction in timing",
    },
    {
        instruction:
            "Explain your market entry decision. Highlight the convergence of factors that triggered this token swap. Begin with your primary catalyst.",
        style: "- Connect price action to broader market context\n- Balance methodical analysis with opportunistic timing\n- Keep tone precise and action-oriented",
    },
];
