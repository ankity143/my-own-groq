import { ModelDefinition, ProviderId } from "@/types";

export const PROVIDERS_META: Record<
  ProviderId,
  {
    name: string;
    description: string;
    keyPlaceholder: string;
    keyHelpUrl: string;
    requiresProxy: boolean;
    supportsDynamicModels: boolean;
  }
> = {
  groq: {
    name: "Groq",
    description: "Ultra-low latency LPU inference engine for open-weights models.",
    keyPlaceholder: "gsk_...",
    keyHelpUrl: "https://console.groq.com/keys",
    requiresProxy: true, // Groq enforces CORS on browser calls
    supportsDynamicModels: true,
  },
  openai: {
    name: "OpenAI",
    description: "Industry standard models including GPT-4o, GPT-4o Mini, and o1.",
    keyPlaceholder: "sk-proj-...",
    keyHelpUrl: "https://platform.openai.com/api-keys",
    requiresProxy: true,
    supportsDynamicModels: true,
  },
  gemini: {
    name: "Google Gemini",
    description: "Next-generation multimodal AI with huge context windows.",
    keyPlaceholder: "AIzaSy...",
    keyHelpUrl: "https://aistudio.google.com/app/apikey",
    requiresProxy: true,
    supportsDynamicModels: true,
  },
  anthropic: {
    name: "Anthropic Claude",
    description: "Claude 3.5 Sonnet and Haiku with superior reasoning and nuanced writing.",
    keyPlaceholder: "sk-ant-...",
    keyHelpUrl: "https://console.anthropic.com/settings/keys",
    requiresProxy: true, // Anthropic enforces CORS on browser calls
    supportsDynamicModels: false,
  },
  openrouter: {
    name: "OpenRouter",
    description: "Unified gateway providing access to hundreds of AI models with single key.",
    keyPlaceholder: "sk-or-v1-...",
    keyHelpUrl: "https://openrouter.ai/keys",
    requiresProxy: true,
    supportsDynamicModels: true,
  },
};

export const MODEL_REGISTRY: ModelDefinition[] = [
  // --- GROQ ---
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B Versatile",
    provider: "groq",
    contextWindow: 128000,
    maxOutputTokens: 32768,
    capabilities: ["text", "tools", "json_mode", "streaming"],
    pricing: { inputPer1M: 0.59, outputPer1M: 0.79 },
    speedRating: "Ultra Fast",
    tokensPerSecEstimate: 280,
    description: "Meta's flagship 70B model running at lightning speeds on Groq LPUs.",
    isPopular: true,
  },
  {
    id: "llama-3.1-8b-instant",
    name: "Llama 3.1 8B Instant",
    provider: "groq",
    contextWindow: 128000,
    maxOutputTokens: 8192,
    capabilities: ["text", "tools", "json_mode", "streaming"],
    pricing: { inputPer1M: 0.05, outputPer1M: 0.08 },
    speedRating: "Ultra Fast",
    tokensPerSecEstimate: 750,
    description: "Instant sub-100ms responses for high-velocity tasks and classification.",
    isPopular: true,
  },
  {
    id: "llama-3.2-11b-vision-preview",
    name: "Llama 3.2 11B Vision",
    provider: "groq",
    contextWindow: 128000,
    maxOutputTokens: 8192,
    capabilities: ["text", "vision", "tools", "json_mode", "streaming"],
    pricing: { inputPer1M: 0.16, outputPer1M: 0.20 },
    speedRating: "Ultra Fast",
    tokensPerSecEstimate: 420,
    description: "Multimodal image reasoning and document analysis at Groq speed.",
    isPopular: true,
  },
  {
    id: "deepseek-r1-distill-llama-70b",
    name: "DeepSeek R1 Distill 70B",
    provider: "groq",
    contextWindow: 128000,
    maxOutputTokens: 16384,
    capabilities: ["text", "tools", "json_mode", "streaming"],
    pricing: { inputPer1M: 0.75, outputPer1M: 0.99 },
    speedRating: "Fast",
    tokensPerSecEstimate: 200,
    description: "Deep reasoning distillation on Meta architecture with chain-of-thought.",
    isPopular: true,
  },
  {
    id: "mixtral-8x7b-32768",
    name: "Mixtral 8x7B",
    provider: "groq",
    contextWindow: 32768,
    maxOutputTokens: 4096,
    capabilities: ["text", "tools", "json_mode", "streaming"],
    pricing: { inputPer1M: 0.24, outputPer1M: 0.24 },
    speedRating: "Ultra Fast",
    tokensPerSecEstimate: 450,
    description: "Mistral's high-efficiency Mixture of Experts model.",
  },
  {
    id: "gemma2-9b-it",
    name: "Gemma 2 9B Instruct",
    provider: "groq",
    contextWindow: 8192,
    maxOutputTokens: 4096,
    capabilities: ["text", "json_mode", "streaming"],
    pricing: { inputPer1M: 0.20, outputPer1M: 0.20 },
    speedRating: "Ultra Fast",
    tokensPerSecEstimate: 500,
    description: "Google's lightweight open model optimized for accuracy and fast replies.",
  },

  // --- OPENAI ---
  {
    id: "gpt-4o",
    name: "GPT-4o (Omni)",
    provider: "openai",
    contextWindow: 128000,
    maxOutputTokens: 16384,
    capabilities: ["text", "vision", "tools", "json_mode", "json_schema", "streaming"],
    pricing: { inputPer1M: 2.50, outputPer1M: 10.00 },
    speedRating: "Fast",
    tokensPerSecEstimate: 110,
    description: "OpenAI's flagship multimodal model with state-of-the-art reasoning.",
    isPopular: true,
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    contextWindow: 128000,
    maxOutputTokens: 16384,
    capabilities: ["text", "vision", "tools", "json_mode", "json_schema", "streaming"],
    pricing: { inputPer1M: 0.15, outputPer1M: 0.60 },
    speedRating: "Fast",
    tokensPerSecEstimate: 140,
    description: "Affordable and fast intelligence for high-volume workflows.",
    isPopular: true,
  },
  {
    id: "o1",
    name: "o1 (Reasoning)",
    provider: "openai",
    contextWindow: 200000,
    maxOutputTokens: 100000,
    capabilities: ["text", "vision", "streaming"],
    pricing: { inputPer1M: 15.00, outputPer1M: 60.00 },
    speedRating: "Balanced",
    tokensPerSecEstimate: 60,
    description: "Deep reasoning model for math, coding, and complex scientific logic.",
  },
  {
    id: "o1-mini",
    name: "o1-mini (Reasoning Fast)",
    provider: "openai",
    contextWindow: 128000,
    maxOutputTokens: 65536,
    capabilities: ["text", "streaming"],
    pricing: { inputPer1M: 3.00, outputPer1M: 12.00 },
    speedRating: "Fast",
    tokensPerSecEstimate: 90,
    description: "Faster reasoning model optimized for code and technical problems.",
  },

  // --- GOOGLE GEMINI ---
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    provider: "gemini",
    contextWindow: 2000000,
    maxOutputTokens: 8192,
    capabilities: ["text", "vision", "tools", "json_mode", "json_schema", "streaming"],
    pricing: { inputPer1M: 1.25, outputPer1M: 5.00 },
    speedRating: "Balanced",
    tokensPerSecEstimate: 75,
    description: "Industry-leading 2M token context window for massive documents and video.",
    isPopular: true,
  },
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    provider: "gemini",
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    capabilities: ["text", "vision", "tools", "json_mode", "json_schema", "streaming"],
    pricing: { inputPer1M: 0.075, outputPer1M: 0.30 },
    speedRating: "Ultra Fast",
    tokensPerSecEstimate: 180,
    description: "Ultra-fast, cost-efficient model with 1M context window and vision.",
    isPopular: true,
  },
  {
    id: "gemini-2.0-flash-exp",
    name: "Gemini 2.0 Flash (Experimental)",
    provider: "gemini",
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    capabilities: ["text", "vision", "tools", "json_mode", "json_schema", "streaming"],
    pricing: { inputPer1M: 0.10, outputPer1M: 0.40 },
    speedRating: "Ultra Fast",
    tokensPerSecEstimate: 220,
    description: "Next-gen architecture from Google with realtime multimodal capabilities.",
    isPopular: true,
  },

  // --- ANTHROPIC CLAUDE ---
  {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
    contextWindow: 200000,
    maxOutputTokens: 8192,
    capabilities: ["text", "vision", "tools", "streaming"],
    pricing: { inputPer1M: 3.00, outputPer1M: 15.00 },
    speedRating: "Fast",
    tokensPerSecEstimate: 95,
    description: "Anthropic's smartest model: premier coding, reasoning, and human tone.",
    isPopular: true,
  },
  {
    id: "claude-3-5-haiku-20241022",
    name: "Claude 3.5 Haiku",
    provider: "anthropic",
    contextWindow: 200000,
    maxOutputTokens: 8192,
    capabilities: ["text", "tools", "streaming"],
    pricing: { inputPer1M: 0.80, outputPer1M: 4.00 },
    speedRating: "Ultra Fast",
    tokensPerSecEstimate: 160,
    description: "Blazing fast Claude model matching Claude 3 Opus in benchmarks.",
    isPopular: true,
  },
  {
    id: "claude-3-opus-20240229",
    name: "Claude 3 Opus",
    provider: "anthropic",
    contextWindow: 200000,
    maxOutputTokens: 4096,
    capabilities: ["text", "vision", "tools", "streaming"],
    pricing: { inputPer1M: 15.00, outputPer1M: 75.00 },
    speedRating: "Powerful",
    tokensPerSecEstimate: 45,
    description: "Deep intellectual analysis, philosophy, and complex tasks.",
  },

  // --- OPENROUTER ---
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet (via OpenRouter)",
    provider: "openrouter",
    contextWindow: 200000,
    maxOutputTokens: 8192,
    capabilities: ["text", "vision", "tools", "streaming"],
    pricing: { inputPer1M: 3.00, outputPer1M: 15.00 },
    speedRating: "Fast",
    tokensPerSecEstimate: 90,
    description: "Access Claude 3.5 Sonnet through OpenRouter's reliable routing.",
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o (via OpenRouter)",
    provider: "openrouter",
    contextWindow: 128000,
    maxOutputTokens: 16384,
    capabilities: ["text", "vision", "tools", "streaming"],
    pricing: { inputPer1M: 2.50, outputPer1M: 10.00 },
    speedRating: "Fast",
    tokensPerSecEstimate: 100,
    description: "Access GPT-4o with no provider lock-in.",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B Instruct (via OpenRouter)",
    provider: "openrouter",
    contextWindow: 131072,
    maxOutputTokens: 8192,
    capabilities: ["text", "tools", "streaming"],
    pricing: { inputPer1M: 0.40, outputPer1M: 0.40 },
    speedRating: "Fast",
    tokensPerSecEstimate: 120,
    description: "OpenRouter hosted high-throughput Llama 3.3 70B.",
  },
  {
    id: "mistralai/mistral-large-2407",
    name: "Mistral Large 2 (via OpenRouter)",
    provider: "openrouter",
    contextWindow: 128000,
    maxOutputTokens: 8192,
    capabilities: ["text", "tools", "json_mode", "streaming"],
    pricing: { inputPer1M: 2.00, outputPer1M: 6.00 },
    speedRating: "Fast",
    tokensPerSecEstimate: 80,
    description: "Mistral's flagship model specialized in reasoning, multilingual, and code.",
  },
];

export function getModelById(modelId: string): ModelDefinition | undefined {
  return MODEL_REGISTRY.find((m) => m.id === modelId);
}

export function getModelsByProvider(provider: ProviderId): ModelDefinition[] {
  return MODEL_REGISTRY.filter((m) => m.provider === provider);
}

export function calculateEstimatedCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const model = getModelById(modelId);
  if (!model) return 0;
  const inputCost = (inputTokens / 1_000_000) * model.pricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * model.pricing.outputPer1M;
  return inputCost + outputCost;
}
