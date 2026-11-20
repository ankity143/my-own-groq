import {
  ExperimentRecord,
  PromptTemplate,
  UserSettings,
  ProviderId,
  ModelParameters,
} from "@/types";
import { isBrowser } from "@/lib/security/key-storage";

const EXPERIMENTS_KEY = "fruitai_experiments";
const TEMPLATES_KEY = "fruitai_prompt_templates";
const SETTINGS_KEY = "fruitai_user_settings";

export const DEFAULT_PARAMETERS: ModelParameters = {
  temperature: 0.7,
  maxTokens: 2048,
  topP: 1.0,
  stopSequences: [],
  responseFormat: "text",
};

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "dark",
  defaultProvider: "groq",
  defaultModel: "llama-3.1-8b-instant",
  storagePreference: "local",
  defaultParameters: DEFAULT_PARAMETERS,
  autoSaveExperiments: true,
};

export const STARTER_PROMPTS: PromptTemplate[] = [
  {
    id: "starter-1",
    title: "Zero-Shot Technical Architect",
    description: "Evaluates software system architectures without any few-shot demonstrations.",
    category: "Architecture",
    tags: ["zero-shot", "engineering", "system-design"],
    systemPrompt:
      "You are a Principal Software Architect. Analyze designs for scalability, reliability, latency, and cost-efficiency. Provide structured recommendations.",
    userPrompt:
      "Design a real-time event streaming pipeline capable of handling 500,000 events/second with exactly-once processing semantics and sub-second p99 latency.",
    isFavorite: true,
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
    currentVersion: 1,
    versions: [
      {
        version: 1,
        name: "Initial Draft",
        description: "Zero-shot architecture prompt",
        systemPrompt: "You are a Principal Software Architect.",
        userPrompt: "Design a real-time event streaming pipeline...",
        timestamp: Date.now() - 86400000 * 2,
      },
    ],
  },
  {
    id: "starter-2",
    title: "One-Shot Sentiment & Tone Classifier",
    description: "Demonstrates exact one-shot format with single input-output example.",
    category: "Classification",
    tags: ["one-shot", "sentiment", "nlp"],
    systemPrompt:
      "Classify customer feedback into Sentiment, Tone, and Actionable Item in exact JSON format.",
    userPrompt: `Input: "The checkout process was fast, but customer support took 48 hours to respond to my billing question."
Output: {"sentiment": "mixed", "tone": "frustrated", "actionable": "Reduce support queue response time"}

Input: "Your new fruit dashboard looks gorgeous and loaded in 80ms! Keep up the great work team."
Output:`,
    isFavorite: true,
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 3,
    currentVersion: 1,
    versions: [],
  },
  {
    id: "starter-3",
    title: "Few-Shot Query-to-SQL Generator",
    description: "Multi-shot demonstration translating natural language requests into Postgres SQL.",
    category: "Database",
    tags: ["few-shot", "sql", "postgres"],
    systemPrompt:
      "Convert natural language requests to performant PostgreSQL queries using the ecommerce schema: users(id, name, created_at), orders(id, user_id, amount, status, created_at).",
    userPrompt: `Example 1:
Input: Show total revenue from completed orders in November 2026.
Output: SELECT SUM(amount) AS total_revenue FROM orders WHERE status = 'completed' AND created_at >= '2026-11-01' AND created_at < '2026-12-01';

Example 2:
Input: Find the top 5 users who spent the most this year.
Output: SELECT u.name, SUM(o.amount) AS total_spent FROM users u JOIN orders o ON u.id = o.user_id WHERE o.status = 'completed' AND o.created_at >= '2026-01-01' GROUP BY u.id, u.name ORDER BY total_spent DESC LIMIT 5;

Example 3:
Input: Count users who registered in the last 30 days but never made an order.
Output: SELECT COUNT(u.id) AS inactive_users FROM users u LEFT JOIN orders o ON u.id = o.user_id WHERE u.created_at >= NOW() - INTERVAL '30 days' AND o.id IS NULL;

Input: List the month-over-month growth percentage in order volume for 2026.
Output:`,
    isFavorite: false,
    createdAt: Date.now() - 86400000 * 4,
    updatedAt: Date.now() - 86400000 * 4,
    currentVersion: 1,
    versions: [],
  },
  {
    id: "starter-4",
    title: "Strict JSON Structured Extractor",
    description: "Extracts biographical entity data adhering strictly to JSON Schema.",
    category: "Data Extraction",
    tags: ["json", "structured-output", "schema"],
    systemPrompt:
      "You are a structured data extractor. You must respond ONLY with valid JSON conforming to the requested schema. No conversational filler.",
    userPrompt:
      "Extract the full name, birth year, key inventions, and death year (if deceased) for Nikola Tesla, Ada Lovelace, and Alan Turing.",
    isFavorite: false,
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000 * 5,
    currentVersion: 1,
    versions: [],
  },
];

// --- SETTINGS STORAGE ---
export function loadUserSettings(): UserSettings {
  if (!isBrowser()) return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveUserSettings(settings: Partial<UserSettings>): UserSettings {
  if (!isBrowser()) return DEFAULT_SETTINGS;
  try {
    const current = loadUserSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// --- PROMPT TEMPLATES STORAGE ---
export function loadPromptTemplates(): PromptTemplate[] {
  if (!isBrowser()) return STARTER_PROMPTS;
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    if (!raw) {
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(STARTER_PROMPTS));
      return STARTER_PROMPTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : STARTER_PROMPTS;
  } catch {
    return STARTER_PROMPTS;
  }
}

export function savePromptTemplate(template: PromptTemplate): void {
  if (!isBrowser()) return;
  try {
    const templates = loadPromptTemplates();
    const index = templates.findIndex((t) => t.id === template.id);
    if (index >= 0) {
      templates[index] = template;
    } else {
      templates.unshift(template);
    }
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  } catch (err) {
    console.error("Error saving prompt template:", err);
  }
}

export function deletePromptTemplate(id: string): void {
  if (!isBrowser()) return;
  try {
    const templates = loadPromptTemplates().filter((t) => t.id !== id);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  } catch (err) {
    console.error("Error deleting prompt template:", err);
  }
}

// --- EXPERIMENTS STORAGE ---
export function loadExperiments(): ExperimentRecord[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(EXPERIMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveExperiment(experiment: ExperimentRecord): void {
  if (!isBrowser()) return;
  try {
    const experiments = loadExperiments();
    // Prepend new experiment
    experiments.unshift(experiment);
    // Keep up to 100 recent experiments locally
    const capped = experiments.slice(0, 100);
    localStorage.setItem(EXPERIMENTS_KEY, JSON.stringify(capped));
  } catch (err) {
    console.error("Error saving experiment:", err);
  }
}

export function deleteExperiment(id: string): void {
  if (!isBrowser()) return;
  try {
    const experiments = loadExperiments().filter((e) => e.id !== id);
    localStorage.setItem(EXPERIMENTS_KEY, JSON.stringify(experiments));
  } catch (err) {
    console.error("Error deleting experiment:", err);
  }
}

export function clearAllLocalData(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(EXPERIMENTS_KEY);
  localStorage.removeItem(TEMPLATES_KEY);
  localStorage.removeItem(SETTINGS_KEY);
}

