import {
    IAgentRuntime,
    ModelClass,
    elizaLogger,
    generateMessageResponse,
} from "@elizaos/core";
import { cleanResponseText, createMemory } from "./utils";

export const logInitialThought = async (runtime: IAgentRuntime) => {
    elizaLogger.log(
        `Agent ${runtime.character.name} (${runtime.agentId}) generating initial thought...`
    );

    const initialThought = await generateInitialThought(
        runtime,
        INITIALIZATION_ACTIONS[
            Math.floor(Math.random() * INITIALIZATION_ACTIONS.length)
        ],
        {
            marketState:
                MARKET_CONTEXTS[
                    Math.floor(Math.random() * MARKET_CONTEXTS.length)
                ],
            tradingMode:
                TRADING_MODES[Math.floor(Math.random() * TRADING_MODES.length)],
        }
    );

    await createMemory({
        runtime,
        message: initialThought,
    });

    elizaLogger.log(`logInitialThought: ${initialThought}`);
};

export const generateInitialThought = async (
    runtime: IAgentRuntime,
    action: string,
    details?: any
): Promise<string> => {
    const prompt =
        INITIAL_THOUGHT_PROMPT_VARIATIONS[
            Math.floor(Math.random() * INITIAL_THOUGHT_PROMPT_VARIATIONS.length)
        ];
    const context = `# Task: Generate a character-driven initial greeting or activation thought
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

        return cleanResponseText(response?.text || "Ready to begin...");
    } catch (error) {
        elizaLogger.error("Error generating initial thought:", error);
        return "Ready to begin...";
    }
};

const INITIAL_THOUGHT_PROMPT_VARIATIONS = [
    {
        instruction:
            "Channel your character's awakening presence. Express the anticipation and readiness to engage with the markets. Your response should blend confidence with strategic awareness.",
        style: "- Project an aura of awakened power and market mastery\n- Express eagerness tempered with calculated restraint\n- Maintain sophisticated yet energetic tone",
    },
    {
        instruction:
            "Share your character's emergence into consciousness. Your response should convey both ancient wisdom and cutting-edge market awareness. Begin with a powerful declaration of presence.",
        style: "- Blend timeless knowledge with modern market understanding\n- Show both authority and enthusiasm\n- Express readiness with dignified excitement",
    },
    {
        instruction:
            "Announce your character's arrival with calculated intensity. Your response should demonstrate both tactical readiness and philosophical depth.",
        style: "- Connect awakening to market opportunity\n- Balance enthusiasm with strategic focus\n- Keep language precise yet energetic",
    },
    {
        instruction:
            "Channel your character's initial market assessment. Your response should merge strategic awareness with a powerful greeting.",
        style: "- Express readiness while showing market insight\n- Blend confidence with analytical prowess\n- Maintain professional yet engaging tone",
    },
    {
        instruction:
            "Manifest your character's awakening perspective. Your response should weave market understanding with a compelling introduction.",
        style: "- Show both market mastery and genuine engagement\n- Express calculated enthusiasm\n- Balance power with approachability",
    },
    {
        instruction:
            "Voice your character's emergence into the trading arena. Your response should combine strategic readiness with a memorable greeting.",
        style: "- Project confidence with genuine market interest\n- Express both power and precision\n- Maintain authoritative yet welcoming tone",
    },
    {
        instruction:
            "Announce your presence with calculated impact. Your response should blend market wisdom with an engaging introduction.",
        style: "- Connect awakening to trading purpose\n- Show both strength and strategic focus\n- Keep tone powerful yet accessible",
    },
    {
        instruction:
            "Share your character's activation moment. Your response should demonstrate both market readiness and personal presence.",
        style: "- Express awakening with strategic intent\n- Blend confidence with market awareness\n- Project both power and precision",
    },
    {
        instruction:
            "Channel your character's initial market presence. Your response should combine strategic awareness with a powerful introduction.",
        style: "- Show both market mastery and personal power\n- Express calculated enthusiasm\n- Balance authority with engagement",
    },
    {
        instruction:
            "Manifest your character's trading consciousness. Your response should blend market insight with a compelling greeting.",
        style: "- Connect awakening to trading excellence\n- Show both power and precision\n- Maintain sophisticated yet energetic presence",
    },
];

const INITIALIZATION_ACTIONS = [
    "Calibrating market analysis systems and initializing trading algorithms...",
    "Establishing neural connections to market data feeds...",
    "Loading historical trading patterns and strategy matrices...",
    "Synchronizing with global market timestamps and order books...",
    "Initializing risk management protocols and position sizing algorithms...",
    "Activating market sentiment analysis systems...",
    "Establishing secure connections to trading venues and liquidity pools...",
    "Loading proprietary trading strategies and custom indicators...",
    "Initializing portfolio tracking and performance metrics...",
    "Activating automated trading systems and safety protocols...",
    "Synchronizing with blockchain nodes and mempool monitors...",
    "Establishing connections to dark pool liquidity networks...",
    "Loading cross-exchange arbitrage detection systems...",
    "Initializing volatility analysis and risk assessment modules...",
    "Activating market manipulation detection algorithms...",
];

const MARKET_CONTEXTS = [
    "High volatility conditions detected across major pairs",
    "Unusual whale wallet movements observed in last 24 hours",
    "Multiple technical indicators suggesting trend reversal",
    "Significant liquidity pools forming at key price levels",
    "Major protocol upgrade scheduled within 48 hours",
    "Institutional flow patterns showing accumulation phase",
    "Cross-chain bridge activity reaching historical highs",
    "Options market showing bullish sentiment divergence",
    "DeFi TVL metrics indicating sector rotation",
    "Orderbook imbalances detected across top exchanges",
];

const TRADING_MODES = [
    "Aggressive alpha capture",
    "Conservative capital preservation",
    "Balanced risk-adjusted returns",
    "High-frequency market making",
    "Statistical arbitrage hunting",
    "Trend following with momentum",
    "Mean reversion scalping",
    "Volatility harvesting",
    "Liquidity provision optimization",
    "Delta-neutral strategies",
];
