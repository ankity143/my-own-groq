"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Key,
  HardDrive,
  Moon,
  Sun,
  Shield,
  Trash2,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  Check,
  AlertTriangle,
} from "lucide-react";
import { UserSettings, ProviderId } from "@/types";
import {
  loadUserSettings,
  saveUserSettings,
  DEFAULT_SETTINGS,
  clearAllLocalData,
} from "@/lib/storage";
import { MODEL_REGISTRY, PROVIDERS_META } from "@/lib/model-registry/models";
import { getAllStoredKeys, removeStoredKey } from "@/lib/security/key-storage";
import { useToast } from "@/components/ui/toast";
import { ApiKeyModal } from "@/components/byok/api-key-modal";

export default function SettingsPage() {
  const toast = useToast();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [configuredKeys, setConfiguredKeys] = useState<Record<ProviderId, any>>({
    groq: null,
    openai: null,
    gemini: null,
    anthropic: null,
    openrouter: null,
  });

  useEffect(() => {
    setSettings(loadUserSettings());
    setConfiguredKeys(getAllStoredKeys());
  }, []);

  const handleUpdate = (updates: Partial<UserSettings>) => {
    const updated = saveUserSettings(updates);
    setSettings(updated);
    toast.success("Settings Updated", "Preferences saved to local device.");
  };

  const handleClearAllData = () => {
    if (
      confirm(
        "Are you sure you want to delete ALL saved templates, experiment history, and settings from this browser?"
      )
    ) {
      clearAllLocalData();
      setSettings(DEFAULT_SETTINGS);
      toast.info("Data Cleared", "All local application data removed.");
    }
  };

  const handleExportAll = () => {
    const data = {
      settings,
      timestamp: Date.now(),
      appName: "FruitAI Playground",
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fruitai-settings-${Date.now()}.json`;
    a.click();
    toast.success("Settings Exported", "Downloaded JSON backup.");
  };

  return (
    <div className="flex-1 p-4 sm:p-8 max-w-5xl mx-auto w-full space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="border-b border-border pb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-fruit-500/15 border border-fruit-500/30 text-fruit-700 dark:text-fruit-300 text-xs font-semibold mb-2">
          <Settings className="w-3.5 h-3.5 text-fruit-500" />
          Environment & Client Configuration
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          FruitAI Settings
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
          Configure default inference parameters, manage your BYOK keys, and inspect privacy controls.
        </p>
      </div>

      {/* BYOK Keys Summary Section */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-fruit-500/15 border border-fruit-500/25 flex items-center justify-center text-fruit-600 dark:text-fruit-400">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">BYOK Credentials Management</h2>
              <p className="text-xs text-muted-foreground">Manage your 5 supported provider keys</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setKeyModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-fruit-500 hover:bg-fruit-600 text-slate-950 font-bold text-xs shadow-md transition-all"
          >
            Manage Keys
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
          {(Object.keys(PROVIDERS_META) as ProviderId[]).map((pid) => {
            const has = Boolean(configuredKeys[pid]);
            return (
              <div
                key={pid}
                className={`p-3 rounded-xl border text-xs flex flex-col justify-between ${
                  has
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-200"
                    : "bg-muted/40 border-border text-muted-foreground"
                }`}
              >
                <div className="font-bold">{PROVIDERS_META[pid].name}</div>
                <div className="text-[10px] mt-2 font-medium">
                  {has ? "Active Key Stored" : "Not Configured"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Default Model & Provider */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-5">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-fruit-500" /> Default Model & Startup Preferences
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
              Default Provider
            </label>
            <select
              value={settings.defaultProvider}
              onChange={(e) => handleUpdate({ defaultProvider: e.target.value as ProviderId })}
              className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs font-semibold outline-none focus:border-fruit-500"
            >
              {(Object.keys(PROVIDERS_META) as ProviderId[]).map((pid) => (
                <option key={pid} value={pid}>
                  {PROVIDERS_META[pid].name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
              Default Model
            </label>
            <select
              value={settings.defaultModel}
              onChange={(e) => handleUpdate({ defaultModel: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs font-semibold outline-none focus:border-fruit-500"
            >
              {MODEL_REGISTRY.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.provider})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Experiment Auto-save toggle */}
        <div className="pt-3 border-t border-border flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-foreground block">
              Auto-save Experiments to Local Storage
            </span>
            <span className="text-xs text-muted-foreground">
              Automatically persist playground requests into your local history timeline.
            </span>
          </div>

          <input
            type="checkbox"
            checked={settings.autoSaveExperiments}
            onChange={(e) => handleUpdate({ autoSaveExperiments: e.target.checked })}
            className="w-4 h-4 accent-fruit-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Default Inference Parameters */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-5">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-fruit-500" /> Default Inference Hyperparameters
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground block mb-1">
              Default Temperature ({settings.defaultParameters.temperature})
            </label>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={settings.defaultParameters.temperature}
              onChange={(e) =>
                handleUpdate({
                  defaultParameters: {
                    ...settings.defaultParameters,
                    temperature: parseFloat(e.target.value),
                  },
                })
              }
              className="w-full accent-fruit-500 cursor-pointer"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground block mb-1">
              Default Max Output Tokens ({settings.defaultParameters.maxTokens})
            </label>
            <input
              type="range"
              min={256}
              max={8192}
              step={256}
              value={settings.defaultParameters.maxTokens}
              onChange={(e) =>
                handleUpdate({
                  defaultParameters: {
                    ...settings.defaultParameters,
                    maxTokens: parseInt(e.target.value),
                  },
                })
              }
              className="w-full accent-fruit-500 cursor-pointer"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground block mb-1">
              Default Top P ({settings.defaultParameters.topP})
            </label>
            <input
              type="range"
              min={0.1}
              max={1.0}
              step={0.05}
              value={settings.defaultParameters.topP}
              onChange={(e) =>
                handleUpdate({
                  defaultParameters: {
                    ...settings.defaultParameters,
                    topP: parseFloat(e.target.value),
                  },
                })
              }
              className="w-full accent-fruit-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Backup, Export & Clear Data */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-fruit-500" /> Storage & Privacy Management
        </h2>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-border hover:bg-muted transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export Settings Backup
            </button>
          </div>

          <button
            type="button"
            onClick={handleClearAllData}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear All Local Data
          </button>
        </div>
      </div>

      {/* About FruitAI */}
      <div className="p-6 rounded-2xl bg-muted/30 border border-border space-y-2 text-xs text-muted-foreground">
        <h3 className="font-bold text-foreground text-sm">About FruitAI</h3>
        <p className="leading-relaxed">
          FruitAI is a zero-telemetry, developer-first AI experimentation platform built with Next.js, React, and Tailwind CSS.
          Every user brings their own API credentials, stored exclusively in the browser. No shared server database or centralized key storage exists.
        </p>
        <div className="pt-2 text-[11px] font-mono">
          Version 1.0.0 • Production Ready for Vercel Deployment
        </div>
      </div>

      <ApiKeyModal
        isOpen={keyModalOpen}
        onClose={() => {
          setKeyModalOpen(false);
          setConfiguredKeys(getAllStoredKeys());
        }}
      />
    </div>
  );
}
