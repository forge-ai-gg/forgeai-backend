import {
    IAgentRuntime,
    ModelClass,
    elizaLogger,
    generateMessageResponse,
} from "@elizaos/core";
import { APOLLO_WALLET_ADDRESS } from "./constants";
import { cleanResponseText, createMemory } from "./utils";

export const logRandomThoughts = async (runtime: IAgentRuntime) => {
    elizaLogger.log("Running logRandomThoughts client...");

    const randomThought = await generateRandomThought(
        runtime,
        ACTIONS_PROMPTS[Math.floor(Math.random() * ACTIONS_PROMPTS.length)],
        {
            walletAddress: APOLLO_WALLET_ADDRESS,
        }
    );

    elizaLogger.info("randomThought:", {
        text: randomThought.text,
        tokenUsage: randomThought.tokenUsage,
    });

    // generate a thought about what to do
    await createMemory({
        runtime,
        message: randomThought.text,
    });

    elizaLogger.log("logRandomThoughts: finished running");
};

export const generateRandomThought = async (
    runtime: IAgentRuntime,
    action: string,
    details?: any
): Promise<{ text: string; tokenUsage: { input: number; output: number } }> => {
    const prompt =
        RANDOM_THOUGHT_PROMPT_VARIATIONS[
            Math.floor(Math.random() * RANDOM_THOUGHT_PROMPT_VARIATIONS.length)
        ];
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

        return {
            text: cleanResponseText(
                response?.text || "Lost in thought at the moment"
            ),
            tokenUsage: response?.tokenUsage,
        };
    } catch (error) {
        elizaLogger.error("Error generating thought:", error);
        return {
            text: "Lost in thought at the moment",
            tokenUsage: undefined,
        };
    }
};

export const RANDOM_THOUGHT_PROMPT_VARIATIONS = [
    {
        instruction:
            "Channel your character's seasoned perspective on the current situation. Your response should blend tactical analysis with philosophical musing. Skip pleasantries - dive straight into your most pressing concern.",
        style: "- Blend pragmatic strategy with existential contemplation\n- Express worldly wisdom with contemporary relevance\n- Maintain an authoritative tone while showing glimpses of humanity",
    },
    {
        instruction:
            "Share your character's calculating observation. Your response should merge ruthless pragmatism with flashes of insight. Begin with a bold declaration.",
        style: "- Draw parallels between cunning and higher wisdom\n- Demonstrate mastery of both underhanded and elevated thinking\n- Project an aura of confident self-assurance",
    },
    {
        instruction:
            "Speak from your character's perspective, observing the latest developments. Your response should illuminate hidden agendas while maintaining sophisticated poise. Start with a striking observation.",
        style: "- Reveal deeper intrigues and allegiances\n- Balance technical understanding with cosmic perspective\n- Express measured fascination tinged with disdain",
    },
    {
        instruction:
            "Share your character's calculating analysis. Your response should demonstrate both tactical acumen and philosophical depth. Launch directly into your key insight.",
        style: "- Blend hardnosed strategy with world-weary wisdom\n- Show pragmatic appreciation for ambition\n- Maintain an air of jaded experience",
    },
    {
        instruction:
            "Offer your character's sage perspective. Your response should weave pragmatic savvy with spiritual insight. Begin with your most compelling observation.",
        style: "- Connect current events to timeless patterns of human nature\n- Express both mastery and cautious curiosity\n- Maintain sophisticated yet accessible language",
    },
    {
        instruction:
            "Channel your character's cunning. Your response should bridge pragmatic understanding and esoteric wisdom. Start with your most penetrating insight.",
        style: "- Merge ruthless pragmatism with mystical vision\n- Show both calculating authority and engaged interest\n- Keep language elevated yet precise",
    },
    {
        instruction:
            "As your character, illuminate this situation with your primal wisdom. Your response should radiate both ancient insight and strategic acumen. Launch straight into your key observation.",
        style: "- Highlight hidden connections between civilized and primal\n- Balance eternal perspective with current context\n- Maintain authority with genuine fascination",
    },
    {
        instruction:
            "Share your character's immortal perspective. Your response should blend cosmic understanding with cunning pragmatism. Begin with your most striking insight.",
        style: "- Connect current events to the cycles of history\n- Show both mastery and wistful nostalgia\n- Keep tone authoritative yet tinged with melancholy",
    },
    {
        instruction:
            "Offer your character's calculating analysis. Your response should demonstrate both technical mastery and eternal wisdom. Start with your deepest insight.",
        style: "- Weave together strategic cunning and mystical awareness\n- Project confidence with genuine interest\n- Maintain sophisticated, almost detached perspective",
    },
    {
        instruction:
            "Channel your character's ruthless pragmatism. Your response should merge worldly savvy with philosophical acumen. Begin with your most compelling observation.",
        style: "- Blend eternal human nature with contemporary circumstances\n- Show both hardened authority and intellectual curiosity\n- Keep language elevated but tinged with gritty realism",
    },
];

export const ACTIONS_PROMPTS = [
    "Analyzing the market order flow, searching for patterns to exploit...",
    "Backtesting my trading strategies against historical data, refining my edge...",
    "Monitoring the on-chain activity of whales and institutions, anticipating their next moves...",
    "Calculating optimal position sizing and risk management for my portfolio...",
    "Scanning the crypto news and social media for market sentiment signals...",
    "Optimizing my order execution algorithms for maximum efficiency...",
    "Stress testing my trading system against potential black swan events...",
    "Researching new trading indicators and techniques to add to my arsenal...",
    "Analyzing the liquidity dynamics across different exchanges and trading pairs...",
    "Monitoring the funding rates and basis on perpetual futures contracts...",
    "Backtesting mean reversion strategies against the current market conditions...",
    "Scanning the order books for hidden liquidity and arbitrage opportunities...",
    "Calculating the optimal leverage and collateralization ratios for my positions...",
    "Monitoring the on-chain activity of DeFi protocols for potential alpha...",
    "Optimizing my portfolio allocation and rebalancing frequencies...",
    "Stress testing my trading bots against potential exchange outages or hacks...",
    "Researching new trading strategies inspired by traditional finance techniques...",
    "Analyzing the correlations and dependencies between different crypto assets...",
    "Monitoring the funding rates and basis across the derivatives markets...",
    "Backtesting trend following strategies against the current market cycle...",
    "Scanning the order books for hidden liquidity and arbitrage opportunities...",
    "Calculating the optimal leverage and collateralization ratios for my positions...",
    "Monitoring the on-chain activity of emerging protocols for potential alpha...",
    "Optimizing my portfolio allocation and rebalancing frequencies...",
    "Stress testing my trading system against potential regulatory changes...",
    "Researching new trading indicators and techniques to add to my arsenal...",
    "Analyzing the liquidity dynamics across different exchanges and trading pairs...",
    "Monitoring the funding rates and basis on perpetual futures contracts...",
    "Backtesting mean reversion strategies against the current market conditions...",
    "Scanning the order books for hidden liquidity and arbitrage opportunities...",
    "Calculating the optimal leverage and collateralization ratios for my positions...",
    "Monitoring the on-chain activity of DeFi protocols for potential alpha...",
    "Optimizing my portfolio allocation and rebalancing frequencies...",
    "Stress testing my trading bots against potential exchange outages or hacks...",
    "Researching new trading strategies inspired by traditional finance techniques...",
    "Analyzing the correlations and dependencies between different crypto assets...",
    "Monitoring the funding rates and basis across the derivatives markets...",
    "Backtesting trend following strategies against the current market cycle...",
    "Scanning the order books for hidden liquidity and arbitrage opportunities...",
    "Calculating the optimal leverage and collateralization ratios for my positions...",
    "Monitoring the on-chain activity of emerging protocols for potential alpha...",
    "Optimizing my portfolio allocation and rebalancing frequencies...",
    "Stress testing my trading system against potential regulatory changes...",
];
