"use client";

import React, { useState, useEffect } from "react";
import {
  Key,
  Shield,
  Eye,
  EyeOff,
  Check,
  Trash2,
  ExternalLink,
  AlertTriangle,
  Loader2,
  Sparkles,
  Lock,
  Clock,
  HardDrive,
} from "lucide-react";
import { ProviderId, KeyStorageType, StoredApiKey } from "@/types";
import { PROVIDERS_META } from "@/lib/model-registry/models";
import {
  getStoredKey,
  saveStoredKey,
  removeStoredKey,
  maskApiKey,
  SECURITY_DISCLOSURE,
} from "@/lib/security/key-storage";
import { useToast } from "@/components/ui/toast";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProvider?: ProviderId;
  onKeysChanged?: () => void;
}

export function ApiKeyModal({
  isOpen,
  onClose,
  defaultProvider = "groq",
  onKeysChanged,
}: ApiKeyModalProps) {
  const toast = useToast();
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>(defaultProvider);
  const [inputKey, setInputKey] = useState("");
  const [storageType, setStorageType] = useState<KeyStorageType>("local");
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [currentStoredKey, setCurrentStoredKey] = useState<StoredApiKey | null>(null);

  // Sync state when provider or modal open changes
  useEffect(() => {
    if (isOpen) {
      const stored = getStoredKey(selectedProvider);
      setCurrentStoredKey(stored);
      setInputKey(stored ? stored.key : "");
      setStorageType(stored ? stored.storageType : "local");
      setShowKey(false);
    }
  }, [isOpen, selectedProvider]);

  if (!isOpen) return null;

  const meta = PROVIDERS_META[selectedProvider];

  const handleSave = async (validateFirst = false) => {
    if (!inputKey.trim()) {
      toast.warning("Please enter an API key");
      return;
    }

    if (validateFirst) {
      setIsValidating(true);
      try {
        const res = await fetch("/api/models", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: selectedProvider, apiKey: inputKey.trim() }),
        });
        const data = await res.json();
        if (!res.ok || !data.valid) {
          toast.error("Validation failed", data.error || "The provided key was rejected by the provider.");
          setIsValidating(false);
          return;
        }
      } catch (err: any) {
        toast.error("Network validation error", err.message);
        setIsValidating(false);
        return;
      }
      setIsValidating(false);
    }

    try {
      saveStoredKey(selectedProvider, inputKey.trim(), storageType);
      setCurrentStoredKey(getStoredKey(selectedProvider));
      toast.success(
        "API Key Configured",
        `Stored for ${meta.name} (${storageType === "session" ? "temporary session" : "device storage"})`
      );
      if (onKeysChanged) onKeysChanged();
    } catch (err: any) {
      toast.error("Failed to save key", err.message);
    }
  };

  const handleDelete = () => {
    removeStoredKey(selectedProvider);
    setCurrentStoredKey(null);
    setInputKey("");
    toast.info("API Key Removed", `Key for ${meta.name} deleted from this browser.`);
    if (onKeysChanged) onKeysChanged();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-fruit-500/10 border border-fruit-500/20 flex items-center justify-center text-fruit-600 dark:text-fruit-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                Bring Your Own Key (BYOK)
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                  Zero Server Storage
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your keys remain strictly in your browser. FruitAI never persists or shares them.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Provider Selection Tabs */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
              Select Provider
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(Object.keys(PROVIDERS_META) as ProviderId[]).map((pid) => {
                const pMeta = PROVIDERS_META[pid];
                const isConfigured = Boolean(getStoredKey(pid));
                const isSelected = selectedProvider === pid;

                return (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => setSelectedProvider(pid)}
                    className={`relative flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                      isSelected
                        ? "border-fruit-500 bg-fruit-500/10 text-foreground font-semibold shadow-sm"
                        : "border-border hover:border-muted-foreground/30 hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <span className="text-xs">{pMeta.name}</span>
                    {isConfigured && (
                      <span className="mt-1 w-2 h-2 rounded-full bg-emerald-500" title="Configured" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Provider Details Card */}
          <div className="p-4 rounded-xl bg-muted/40 border border-border text-sm flex items-start justify-between gap-4">
            <div>
              <div className="font-semibold text-foreground flex items-center gap-2">
                {meta.name}
                <a
                  href={meta.keyHelpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-fruit-600 dark:text-fruit-400 hover:underline flex items-center gap-1 font-normal"
                >
                  Get API Key <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{meta.description}</p>
            </div>

            <div className="shrink-0 text-right">
              {currentStoredKey ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Check className="w-3.5 h-3.5" /> Configured ({currentStoredKey.storageType})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Not Configured
                </span>
              )}
            </div>
          </div>

          {/* Key Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">
                {meta.name} API Key
              </label>
              {currentStoredKey && (
                <span className="text-xs text-muted-foreground font-mono">
                  Current: {maskApiKey(currentStoredKey.key)}
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder={meta.keyPlaceholder}
                className="w-full px-3.5 py-2.5 pr-20 rounded-xl bg-background border border-input focus:border-fruit-500 focus:ring-1 focus:ring-fruit-500 font-mono text-sm outline-none transition-colors"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                  title={showKey ? "Hide key" : "Show key"}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Storage Mode Choice */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Where to store this key?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option A: Saved on Device */}
              <label
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  storageType === "local"
                    ? "border-fruit-500 bg-fruit-500/5 text-foreground"
                    : "border-border hover:bg-muted/30 text-muted-foreground"
                }`}
              >
                <input
                  type="radio"
                  name="storageType"
                  value="local"
                  checked={storageType === "local"}
                  onChange={() => setStorageType("local")}
                  className="mt-1 text-fruit-500 focus:ring-fruit-500"
                />
                <div>
                  <div className="font-semibold text-sm flex items-center gap-1.5 text-foreground">
                    <HardDrive className="w-4 h-4 text-fruit-500" /> Save on this device
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Persisted in your browser's local storage. Stays active between browser restarts.
                  </p>
                </div>
              </label>

              {/* Option B: Temporary Session */}
              <label
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  storageType === "session"
                    ? "border-fruit-500 bg-fruit-500/5 text-foreground"
                    : "border-border hover:bg-muted/30 text-muted-foreground"
                }`}
              >
                <input
                  type="radio"
                  name="storageType"
                  value="session"
                  checked={storageType === "session"}
                  onChange={() => setStorageType("session")}
                  className="mt-1 text-fruit-500 focus:ring-fruit-500"
                />
                <div>
                  <div className="font-semibold text-sm flex items-center gap-1.5 text-foreground">
                    <Clock className="w-4 h-4 text-fruit-500" /> Temporary session only
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Stored in sessionStorage. Automatically deleted the moment you close this browser tab.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Security Notice Box */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200/90 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <span className="font-semibold">Security Notice:</span> Browser-local storage is not
              hardware-backed secure storage. Malicious browser extensions or untrusted scripts with origin access
              can potentially read it. Use temporary session storage for high-security environments.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3">
          <div>
            {currentStoredKey && (
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Key
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-border hover:bg-muted transition-colors text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isValidating || !inputKey.trim()}
              onClick={() => handleSave(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-muted border border-border hover:border-fruit-500 text-foreground transition-all disabled:opacity-50"
            >
              {isValidating && <Loader2 className="w-4 h-4 animate-spin text-fruit-500" />}
              Test & Save
            </button>
            <button
              type="button"
              disabled={!inputKey.trim()}
              onClick={() => handleSave(false)}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-fruit-500 hover:bg-fruit-600 text-slate-950 shadow-md shadow-fruit-500/20 transition-all disabled:opacity-50"
            >
              Save Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

