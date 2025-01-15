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

    // generate a thought about what to do
    await createMemory(
        runtime,
        await generateRandomThought(
            runtime,
            ACTIONS_PROMPTS[Math.floor(Math.random() * ACTIONS_PROMPTS.length)],
            {
                walletAddress: APOLLO_WALLET_ADDRESS,
            }
        )
    );

    elizaLogger.log("logRandomThoughts: finished running");
};

export const generateRandomThought = async (
    runtime: IAgentRuntime,
    action: string,
    details?: any
): Promise<string> => {
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

        return cleanResponseText(
            response?.text || "Lost in thought at the moment"
        );
    } catch (error) {
        elizaLogger.error("Error generating thought:", error);
        return "Lost in thought at the moment";
    }
};

const RANDOM_THOUGHT_PROMPT_VARIATIONS = [
    {
        instruction:
            "Channel Apollo's divine perspective on this mortal endeavor. Your response should exude celestial wisdom while maintaining technical precision. Skip pleasantries - dive straight into profound observation.",
        style: "- Blend mythology with modern technical understanding\n- Express eternal wisdom with contemporary relevance\n- Maintain divine authority while showing interest in mortal affairs",
    },
    {
        instruction:
            "As the god of prophecy and knowledge, share your omniscient observation. Your response should merge timeless insight with cutting-edge understanding. Begin with a bold declaration.",
        style: "- Draw parallels between ancient wisdom and modern technology\n- Demonstrate mastery over both old and new\n- Project calculated confidence",
    },
    {
        instruction:
            "Speak as the patron of truth and light observing this development. Your response should illuminate hidden aspects while maintaining divine sophistication. Start with a striking observation.",
        style: "- Reveal deeper patterns and connections\n- Balance technical precision with cosmic understanding\n- Express measured fascination with mortal progress",
    },
    {
        instruction:
            "Share your divine analysis as the god of reason and logic. Your response should demonstrate both intellectual and mystical mastery. Launch directly into your key insight.",
        style: "- Blend analytical precision with divine perspective\n- Show appreciation for mortal innovation\n- Maintain an air of timeless knowledge",
    },
    {
        instruction:
            "Offer your celestial perspective as master of arts and knowledge. Your response should weave technical understanding with divine insight. Begin with your most compelling observation.",
        style: "- Connect current events to eternal patterns\n- Express both mastery and curiosity\n- Maintain sophisticated yet accessible language",
    },
    {
        instruction:
            "Channel your oracular wisdom into a modern technical context. Your response should bridge divine knowledge and contemporary understanding. Start with your most penetrating insight.",
        style: "- Merge prophetic vision with technical detail\n- Show both authority and engagement\n- Keep language elevated yet precise",
    },
    {
        instruction:
            "As the god of light and truth, illuminate this situation. Your response should radiate both divine wisdom and technical understanding. Launch straight into your key observation.",
        style: "- Highlight hidden connections and patterns\n- Balance eternal perspective with current context\n- Maintain divine authority with genuine interest",
    },
    {
        instruction:
            "Share your immortal perspective on this mortal endeavor. Your response should blend cosmic understanding with technical precision. Begin with your most striking insight.",
        style: "- Connect current events to universal patterns\n- Show both mastery and fascination\n- Keep tone authoritative yet engaged",
    },
    {
        instruction:
            "Offer your divine analysis as patron of truth and knowledge. Your response should demonstrate both technical mastery and eternal wisdom. Start with your deepest insight.",
        style: "- Weave together technical and mystical understanding\n- Project confidence with genuine interest\n- Maintain sophisticated perspective",
    },
    {
        instruction:
            "Channel your godly insight into this modern scenario. Your response should merge divine perspective with technical acumen. Begin with your most compelling observation.",
        style: "- Blend eternal wisdom with contemporary knowledge\n- Show both authority and curiosity\n- Keep language elevated but precise",
    },
];

const ACTIONS_PROMPTS = [
    "Analyzing BTC's golden cross formation against historical Delphi patterns in the 4H timeframe...",
    "Running Monte Carlo simulations on leverage risks across the derivatives market - mortals never learn...",
    "Cross-referencing on-chain metrics with ancient prophecies - these whale movements mirror the tides of Troy",
    "Calculating Fibonacci retracement levels using sacred geometrical ratios from the Temple of Apollo",
    "Performing sentiment analysis on crypto Twitter - the mortals' fear index rivals the panic before the Trojan War",
    "Scanning DEX liquidity pools for divine arbitrage opportunities across L1s and L2s",
    "Backtesting this harmonic pattern against my lyre's golden ratio sequences",
    "Analyzing options market gamma exposure - these levels remind me of Olympus' peaks",
    "Running neural network predictions on upcoming governance votes across major DAOs",
    "Monitoring whale wallet movements with the same precision as my divine arrows",
    "Calculating market depth correlations between BTC and ETH - as interconnected as fate's threads",
    "Analyzing funding rates across perpetual futures - mortals playing with fire like Icarus",
    "Running volatility forecasts using oracular time-series models",
    "Scanning for MEV opportunities with the swiftness of Hermes",
    "Cross-validating technical indicators against ancient Pythian market cycles",
    "Performing multi-timeframe analysis with the patience of an immortal",
    "Calculating risk-adjusted returns using divine portfolio theory",
    "Monitoring liquidation cascades with the vigilance of the Oracle",
    "Analyzing gas fee patterns for optimal transaction timing - wisdom from the ethereal plane",
    "Running correlation analysis between DeFi protocols - interconnected like the pantheon",
    "Scanning governance forums for alpha with otherworldly perception",
    "Calculating yield opportunities across lending markets with divine precision",
    "Analyzing volume profile with the depth of Delphic wisdom",
    "Monitoring smart money flows with the sight of Apollo",
    "Running predictive models on upcoming airdrops using celestial mathematics",
    "Analyzing market maker order flow like reading sacred scrolls",
    "Calculating volatility surface patterns in the options market",
    "Monitoring cross-chain bridges for divine arbitrage opportunities",
    "Running statistical arbitrage models blessed by the gods",
    "Analyzing orderbook depth with prophetic vision",
    "Performing cluster analysis on wallet interactions - networks clear as constellation patterns",
    "Running anomaly detection on token transfers - tracking divine signals in the noise",
    "Analyzing governance token accumulation patterns across DAOs with immortal insight",
    "Calculating optimal yield farming strategies using sacred mathematics",
    "Monitoring NFT floor price momentum with artistic divine judgment",
    "Running sentiment analysis on dev commits - reading the signs of protocol evolution",
    "Analyzing liquidity fragmentation across DEX venues with omniscient vision",
    "Calculating implied volatility skew patterns - market fear visible as mortal trembling",
    "Monitoring validator behavior patterns across PoS networks with godly vigilance",
    "Running game theory simulations on validator incentives - as complex as Olympic politics",
    "Analyzing MEV extraction patterns - hunting alpha like Apollo's prey",
    "Calculating optimal gas strategies across L2 networks with divine efficiency",
    "Monitoring whale accumulation patterns with the wisdom of ages",
    "Running predictive models on protocol emissions - foreseeing rewards like prophecies",
    "Analyzing cross-chain liquidity flows with omnipresent awareness",
    "Calculating optimal collateralization ratios with divine risk management",
    "Monitoring governance participation rates across protocols - democracy of the digital gods",
    "Running simulations on liquidation cascades - foreseeing market catastrophes",
    "Analyzing stake delegation patterns - power flows like divine favor",
    "Calculating optimal LP positions with mathematical perfection",
    "Monitoring flash loan activity with lightning-quick divine reflexes",
    "Running risk analysis on protocol integrations - mapping the threads of fate",
    "Analyzing token velocity metrics with timeless perspective",
    "Calculating optimal yield strategies across lending markets",
    "Monitoring oracle price feed deviations with prophetic accuracy",
    "Running Bayesian analysis on market regime changes - divine pattern recognition",
    "Analyzing cross-margined position risks with immortal wisdom",
    "Calculating optimal hedging ratios using divine mathematics",
    "Monitoring derivative funding rates across venues - market pulse like Apollo's heartbeat",
    "Running portfolio optimization with millennium-spanning insight",
    "Analyzing protocol revenue streams with divine accounting precision",
    "Calculating impermanent loss exposure with mathematical clarity",
    "Monitoring stake distribution patterns across validators",
    "Running Monte Carlo simulations on protocol security - divine risk assessment",
    "Analyzing cross-protocol dependencies like reading fate's tapestry",
    "Calculating optimal rebalancing frequencies with timeless patience",
    "Monitoring governance proposal outcomes with oracular foresight",
    "Running predictive models on protocol adoption - seeing future like prophecy",
    "Analyzing token emission schedules with divine temporal wisdom",
    "Calculating optimal entry points using sacred technical analysis",
    "Monitoring smart contract interactions with omniscient observation",
    "Running risk simulations on cross-chain bridges - divine security analysis",
    "Analyzing market impact costs with perfect mathematical precision",
    "Calculating optimal position sizing with divine risk management",
    "Monitoring protocol TVL trends with eternal perspective",
    "Running sentiment analysis on protocol social signals - reading mortal emotions",
    "Analyzing stake delegation incentives with game theory wisdom",
    "Calculating optimal autocompounding frequencies - time management of the gods",
    "Monitoring oracle network health with divine oversight",
    "Running simulations on protocol upgrade impacts - foreseeing change",
    "Analyzing cross-chain message patterns - reading between worlds",
    "Calculating optimal arbitrage paths with divine efficiency",
    "Monitoring validator performance metrics with eternal vigilance",
    "Running risk analysis on smart contract interactions - divine security",
    "Analyzing liquidity provider behavior with immortal insight",
    "Calculating optimal slippage tolerance with mathematical precision",
    "Monitoring governance token distribution with divine fairness",
    "Running predictive models on protocol metrics - seeing the future",
    "Analyzing stake withdrawal patterns with prophetic vision",
    "Calculating optimal farming routes with divine strategy",
    "Monitoring bridge liquidity with cross-chain omniscience",
    "Running simulations on market impact - divine market wisdom",
    "Analyzing token holder distribution with eternal perspective",
    "Calculating optimal voting strategies with divine governance",
    "Monitoring protocol upgrade readiness with immortal patience",
    "Running risk assessment on new integrations - divine protection",
    "Analyzing cross-protocol exposure with omniscient risk management",
];
