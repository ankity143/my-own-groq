export type ProviderId = "groq" | "openai" | "gemini" | "anthropic" | "openrouter";

export type ModelCapability =
  | "text"
  | "vision"
  | "tools"
  | "json_mode"
  | "json_schema"
  | "streaming";

export interface ModelDefinition {
  id: string;
  name: string;
  provider: ProviderId;
  contextWindow: number;
  maxOutputTokens: number;
  capabilities: ModelCapability[];
  pricing: {
    inputPer1M: number;
    outputPer1M: number;
  };
  speedRating: "Ultra Fast" | "Fast" | "Balanced" | "Powerful";
  tokensPerSecEstimate?: number;
  description: string;
  isPopular?: boolean;
}

export interface ModelParameters {
  temperature: number;
  maxTokens: number;
  topP: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  repetitionPenalty?: number;
  stopSequences: string[];
  seed?: number;
  responseFormat: "text" | "json_object" | "json_schema";
  jsonSchema?: string;
  toolChoice?: "none" | "auto" | "required";
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  parameters: string; // JSON schema string
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface GenerationMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs: number;
  tokensPerSecond: number;
  estimatedCost: number;
  isEstimatedUsage?: boolean;
}

export interface Message {
  id: string;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  timestamp: number;
  images?: string[]; // base64 data URLs
  toolCalls?: ToolCall[];
  toolResult?: {
    toolCallId: string;
    content: string;
  };
  metrics?: GenerationMetrics;
}

export type PromptShotTechnique = "zero-shot" | "one-shot" | "few-shot";

export interface Demonstration {
  input: string;
  output: string;
  rawSnippet: string;
}

export interface DetectedTechnique {
  name: string;
  description: string;
  detected: boolean;
  evidence?: string;
}

export interface PromptQualityScore {
  overall: number;
  clarity: number;
  specificity: number;
  context: number;
  roleDefinition: number;
  taskInstructions: number;
  constraints: number;
  outputFormat: number;
  inputRequirements: number;
}

export interface PromptAnalysisResult {
  technique: PromptShotTechnique;
  confidence: number;
  demonstrationsCount: number;
  demonstrations: Demonstration[];
  explanation: string;
  evidence: string[];
  ambiguityWarnings: string[];
  detectedTechniques: DetectedTechnique[];
  qualityScore: PromptQualityScore;
  missingInformation: string[];
  ambiguousPhrases: string[];
  suggestions: string[];
  improvedPrompt: string;
  improvementRationale: string;
}

export type KeyStorageType = "session" | "local";

export interface StoredApiKey {
  provider: ProviderId;
  key: string;
  storageType: KeyStorageType;
  isValid?: boolean;
  lastValidated?: number;
  label?: string;
}

export interface PromptVersion {
  version: number;
  name: string;
  description: string;
  systemPrompt: string;
  userPrompt: string;
  timestamp: number;
}

export interface PromptTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  systemPrompt: string;
  userPrompt: string;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
  currentVersion: number;
  versions: PromptVersion[];
}

export interface ExperimentRecord {
  id: string;
  title: string;
  timestamp: number;
  provider: ProviderId;
  model: string;
  systemPrompt: string;
  messages: Message[];
  parameters: ModelParameters;
  metrics: GenerationMetrics;
  tags: string[];
}

export interface ComparisonResult {
  id: string;
  modelId: string;
  provider: ProviderId;
  response: string;
  status: "idle" | "loading" | "streaming" | "completed" | "error";
  error?: string;
  metrics?: GenerationMetrics;
}

export interface UserSettings {
  theme: "dark" | "light" | "system";
  defaultProvider: ProviderId;
  defaultModel: string;
  storagePreference: "local" | "session";
  defaultParameters: ModelParameters;
  autoSaveExperiments: boolean;
}

