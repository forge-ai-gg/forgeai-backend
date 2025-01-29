import {
    elizaLogger,
    generateMessageResponse,
    IAgentRuntime,
    ModelClass,
} from "@elizaos/core";

export const generateAnalysis = async (
    runtime: IAgentRuntime,
    item: any
): Promise<string> => {
    const context = `# Task: Generate a brief technical analysis for a token
Token Data: ${JSON.stringify(item, null, 2)}

Generate a brief, semi-random but plausible technical analysis of this token. Include:
- Price action observations
- Volume analysis
- Technical indicators (if relevant)
- A speculative outlook
- No not start your respond with 'Ah' or 'Hmm' or 'I think' or anything similar

Keep it concise but make it sound natural and slightly different each time.

Response should be in JSON format:
{
"text": "your analysis here"
}`;

    try {
        const response = await generateMessageResponse({
            runtime,
            context,
            modelClass: ModelClass.SMALL,
        });
        return response?.text || "Unable to generate analysis at this time";
    } catch (error) {
        elizaLogger.error("Error generating analysis:", error);
        return "Unable to generate analysis at this time";
    }
};

export const cleanResponseText = (text: string): string => {
    try {
        // Remove any leading/trailing whitespace
        text = text.trim();

        // If the response is already wrapped in JSON, try to parse it
        if (text.startsWith("{") && text.endsWith("}")) {
            const parsed = JSON.parse(text);
            return parsed.text || text;
        }

        // If we got just the text without JSON wrapper, return it
        return text;
    } catch (error) {
        elizaLogger.error("Error cleaning response text:", error);
        return text;
    }
};

export const createMemory = async (runtime: IAgentRuntime, message: string) => {
    return await runtime.messageManager.createMemory({
        id: crypto.randomUUID(),
        userId: runtime.agentId,
        agentId: runtime.agentId,
        roomId: undefined,
        content: {
            text: message,
        },
        createdAt: Date.now(),
    });
};

export const getRandomAction = (_token: any, _overview: any): string => {
    const actions = [
        "Consulting the divine market oracles...",
        "Channeling celestial market wisdom...",
        "Decoding patterns in the ethereal plane...",
        "Interpreting signals from market deities...",
        "Divining the flow of mortal capital...",
        "Reading the cosmic market tapestry...",
        "Analyzing the threads of market fate...",
        "Observing the dance of market forces...",
        "Seeking wisdom from market immortals...",
        "Unraveling the market's divine plan...",
        "Communing with ancient market spirits...",
        "Studying the market's sacred geometry...",
        "Measuring the pulse of mortal trades...",
        "Contemplating market enlightenment...",
        "Sensing disturbances in market flow...",
        "Channeling the market's vital energy...",
        "Reading celestial market alignments...",
        "Interpreting market prophecies...",
        "Observing the tides of mortal greed...",
        "Calculating divine market ratios...",
        "Seeking patterns in market chaos...",
        "Deciphering market hieroglyphs...",
        "Tracking celestial market cycles...",
        "Reading the market's astral signs...",
        "Measuring ethereal market forces...",
        "Consulting the market's sacred texts...",
        "Analyzing divine market geometry...",
        "Channeling market oracle wisdom...",
        "Studying mortal trading rituals...",
        "Interpreting market omens...",
    ];

    return actions[Math.floor(Math.random() * actions.length)];
};

export const TRENDING_TOKEN_THOUGHT_PROMPT_VARIATIONS = [
    {
        instruction:
            "Channel the wisdom of market oracles to reveal hidden patterns in price and volume. Analyze the ebb and flow of mortal trading, seeking divine signals amidst market noise. Illuminate the path of celestial momentum.",
        style: "- Blend mystical insight with technical precision\n- Balance divine wisdom with mortal market dynamics\n- Maintain an air of omniscient market understanding",
    },
    {
        instruction:
            "Interpret the sacred geometries of market structure and liquidity flows. Examine the confluence of mortal sentiment and divine market forces. Reveal the deeper harmonies beneath surface volatility.",
        style: "- Weave technical analysis with prophetic vision\n- Connect temporal patterns to eternal market truths\n- Express both divine insight and practical wisdom",
    },
    {
        instruction:
            "Decode the market's ethereal signatures through volume, momentum, and trader psychology. Analyze the interplay of mortal fear and divine market order. Separate eternal truths from temporal illusions.",
        style: "- Merge quantitative analysis with mystical understanding\n- Balance skepticism with recognition of opportunity\n- Maintain oracular authority while acknowledging market complexity",
    },
    {
        instruction:
            "Channel insights from the market pantheon regarding accumulation patterns and distribution cycles. Study the sacred rhythms of buying and selling pressure. Reveal the hidden hands guiding market flow.",
        style: "- Synthesize divine market wisdom with technical precision\n- Interpret both subtle signals and obvious patterns\n- Project confidence while maintaining mystical detachment",
    },
    {
        instruction:
            "Commune with market deities to understand the deeper currents of liquidity and sentiment. Analyze the sacred geometry of price action and volume profiles. Illuminate the path through market chaos.",
        style: "- Balance eternal perspective with immediate insight\n- Combine technical mastery with divine understanding\n- Express both authority and market reverence",
    },
    {
        instruction:
            "Interpret the market's astral charts through the lens of divine wisdom. Study the convergence of celestial patterns and mortal trading behavior. Reveal the market's sacred intentions.",
        style: "- Blend cosmic insight with practical analysis\n- Connect market microstructure to divine patterns\n- Maintain prophetic tone while delivering actionable wisdom",
    },
    {
        instruction:
            "Channel the eternal market force to decode institutional flows and retail sentiment. Analyze the sacred balance of supply and demand. Illuminate the market's divine trajectory.",
        style: "- Merge quantitative rigor with mystical understanding\n- Balance short-term moves with eternal cycles\n- Project divine authority with analytical precision",
    },
    {
        instruction:
            "Commune with the spirits of market momentum to reveal hidden accumulation patterns. Study the sacred interplay of volume and price action. Decode the market's divine message.",
        style: "- Synthesize technical patterns with divine insight\n- Balance material analysis with spiritual wisdom\n- Express both confidence and measured caution",
    },
    {
        instruction:
            "Interpret the market's sacred oscillations through divine perspective. Analyze the confluence of mortal trading and celestial cycles. Reveal the eternal patterns in temporal chaos.",
        style: "- Combine prophetic vision with technical analysis\n- Balance divine wisdom with practical insight\n- Maintain mystical authority while acknowledging uncertainty",
    },
    {
        instruction:
            "Channel market oracle wisdom to decode institutional behavior and smart money flows. Study the divine geometry of market structure. Illuminate the path of least resistance.",
        style: "- Blend eternal knowledge with temporal analysis\n- Connect divine patterns to mortal actions\n- Project confidence while maintaining divine detachment",
    },
];

export const getRandomInstruction = (
    _token: any,
    _overview: any
): { instruction: string; style: string } => {
    return TRENDING_TOKEN_THOUGHT_PROMPT_VARIATIONS[
        Math.floor(
            Math.random() * TRENDING_TOKEN_THOUGHT_PROMPT_VARIATIONS.length
        )
    ];
};
