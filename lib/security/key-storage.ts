import { ProviderId, StoredApiKey, KeyStorageType } from "@/types";

const LOCAL_STORAGE_PREFIX = "fruitai_key_";
const SESSION_STORAGE_PREFIX = "fruitai_skey_";
const ACTIVE_PROVIDERS_KEY = "fruitai_configured_providers";

export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function maskApiKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "••••••••";
  const start = key.slice(0, 4);
  const end = key.slice(-4);
  return `${start}••••••••${end}`;
}

export function getStoredKey(provider: ProviderId): StoredApiKey | null {
  if (!isBrowser()) return null;

  try {
    // 1. Check session storage first (temporary session takes precedence or is checked)
    const sessionVal = sessionStorage.getItem(`${SESSION_STORAGE_PREFIX}${provider}`);
    if (sessionVal) {
      const parsed = JSON.parse(sessionVal);
      return {
        provider,
        key: parsed.key,
        storageType: "session",
        isValid: parsed.isValid,
        lastValidated: parsed.lastValidated,
        label: parsed.label || "Temporary Session",
      };
    }

    // 2. Check local persistent storage
    const localVal = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${provider}`);
    if (localVal) {
      const parsed = JSON.parse(localVal);
      return {
        provider,
        key: parsed.key,
        storageType: "local",
        isValid: parsed.isValid,
        lastValidated: parsed.lastValidated,
        label: parsed.label || "Saved on Device",
      };
    }
  } catch (err) {
    console.warn(`[FruitAI Security] Unable to read storage for provider ${provider}:`, err);
  }

  return null;
}

export function saveStoredKey(
  provider: ProviderId,
  key: string,
  storageType: KeyStorageType,
  label?: string
): void {
  if (!isBrowser()) return;

  const trimmedKey = key.trim();
  const payload = JSON.stringify({
    key: trimmedKey,
    updatedAt: Date.now(),
    label: label || (storageType === "session" ? "Temporary Session" : "Saved on Device"),
  });

  try {
    if (storageType === "session") {
      sessionStorage.setItem(`${SESSION_STORAGE_PREFIX}${provider}`, payload);
      // Clean any stale local key for this provider
      localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${provider}`);
    } else {
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${provider}`, payload);
      // Clean any stale session key for this provider
      sessionStorage.removeItem(`${SESSION_STORAGE_PREFIX}${provider}`);
    }

    // Update list of configured providers
    trackConfiguredProvider(provider, true);
  } catch (err) {
    console.error(`[FruitAI Security] Error writing key for provider ${provider}:`, err);
    throw new Error("Failed to save API key to browser storage. Ensure storage quota is available.");
  }
}

export function removeStoredKey(provider: ProviderId): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.removeItem(`${SESSION_STORAGE_PREFIX}${provider}`);
    localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${provider}`);
    trackConfiguredProvider(provider, false);
  } catch (err) {
    console.warn(`[FruitAI Security] Error removing key for ${provider}:`, err);
  }
}

export function getAllStoredKeys(): Record<ProviderId, StoredApiKey | null> {
  const result: Record<ProviderId, StoredApiKey | null> = {
    groq: null,
    openai: null,
    gemini: null,
    anthropic: null,
    openrouter: null,
  };

  const providers: ProviderId[] = ["groq", "openai", "gemini", "anthropic", "openrouter"];
  for (const p of providers) {
    result[p] = getStoredKey(p);
  }

  return result;
}

function trackConfiguredProvider(provider: ProviderId, add: boolean): void {
  if (!isBrowser()) return;
  try {
    const raw = localStorage.getItem(ACTIVE_PROVIDERS_KEY);
    const set = new Set<string>(raw ? JSON.parse(raw) : []);
    if (add) {
      set.add(provider);
    } else {
      set.delete(provider);
    }
    localStorage.setItem(ACTIVE_PROVIDERS_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // Ignore storage tracking errors
  }
}

export function isProviderConfigured(provider: ProviderId): boolean {
  const key = getStoredKey(provider);
  return Boolean(key && key.key && key.key.trim().length > 5);
}

export const SECURITY_DISCLOSURE = `
SECURITY & PRIVACY DISCLOSURE (BYOK):
• All API keys are stored exclusively on your device (sessionStorage or browser-local storage).
• FruitAI does NOT maintain a user database and never sends your keys to a persistent server.
• When requests are proxied to prevent browser CORS blocks, the key is forwarded strictly in-memory for that single request and never logged, cached, or persisted.
• Notice: Browser-local storage is not hardware-backed secure storage. Malicious browser extensions or XSS attacks could theoretically access stored values. For sensitive keys, choose "Temporary Session Key", which is immediately destroyed when you close the tab.
`;
