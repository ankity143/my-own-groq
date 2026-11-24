"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Terminal,
  ScanSearch,
  Split,
  BookOpen,
  Key,
  Sparkles,
  Zap,
  ArrowRight,
  Shield,
  Clock,
  History,
  TrendingUp,
  Cpu,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { getAllStoredKeys } from "@/lib/security/key-storage";
import { loadExperiments, loadPromptTemplates } from "@/lib/storage";
import { MODEL_REGISTRY, PROVIDERS_META } from "@/lib/model-registry/models";
import { ExperimentRecord, PromptTemplate, ProviderId } from "@/types";
import { formatNumber, formatCost, formatDuration } from "@/lib/utils";
import { ApiKeyModal } from "@/components/byok/api-key-modal";

export default function DashboardPage() {
  const [keys, setKeys] = useState<Record<ProviderId, any>>({
    groq: null,
    openai: null,
    gemini: null,
    anthropic: null,
    openrouter: null,
  });
  const [experiments, setExperiments] = useState<ExperimentRecord[]>([]);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [selectedKeyProvider, setSelectedKeyProvider] = useState<ProviderId>("groq");

  useEffect(() => {
    setKeys(getAllStoredKeys());
    setExperiments(loadExperiments().slice(0, 5));
    setTemplates(loadPromptTemplates().slice(0, 4));
  }, []);

  const configuredCount = Object.values(keys).filter(Boolean).length;
  const popularModels = MODEL_REGISTRY.filter((m) => m.isPopular).slice(0, 4);

  return (
    <div className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-fruit-500/15 via-fruit-500/5 to-transparent border border-fruit-500/20 p-6 sm:p-10 shadow-lg">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-fruit-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fruit-500/15 border border-fruit-500/30 text-fruit-700 dark:text-fruit-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-fruit-500" />
            100% Client-Side BYOK AI Architecture
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground font-sans leading-tight">
            Experiment with AI models at{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-fruit-500 via-amber-400 to-orange-500">
              lightning speed
            </span>
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Welcome to <strong className="text-foreground tracking-tight"><b className="font-black text-foreground">A</b><span className="font-normal">nk</span><b className="font-black text-fruit-500 dark:text-fruit-400">I</b><span className="font-normal">t</span></strong> — the professional playground for prompt
            engineering, multi-turn testing, zero/few-shot prompt analysis, and model cost comparison. Enter your own
            key to begin, or explore the prompt analyzer completely offline.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/playground"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-fruit-500 hover:bg-fruit-600 text-slate-950 font-bold text-sm shadow-lg shadow-fruit-500/25 transition-all transform hover:-translate-y-0.5"
            >
              <Terminal className="w-4 h-4" /> Open 3-Panel Playground
            </Link>

            <Link
              href="/prompt-analysis"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-card hover:bg-muted border border-border text-foreground font-semibold text-sm transition-all"
            >
              <ScanSearch className="w-4 h-4 text-fruit-500" /> Analyze Prompts Offline
            </Link>

            <button
              type="button"
              onClick={() => {
                setSelectedKeyProvider("groq");
                setKeyModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-fruit-500/10 hover:bg-fruit-500/20 border border-fruit-500/30 text-fruit-700 dark:text-fruit-300 font-semibold text-sm transition-all"
            >
              <Key className="w-4 h-4 text-fruit-500" /> Manage BYOK Keys ({configuredCount}/5)
            </button>
          </div>
        </div>
      </div>

      {/* BYOK Provider Connection Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-fruit-500" /> BYOK Connection Status
          </h2>
          <span className="text-xs text-muted-foreground">
            {configuredCount} of 5 providers active
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(Object.keys(PROVIDERS_META) as ProviderId[]).map((pid) => {
            const meta = PROVIDERS_META[pid];
            const stored = keys[pid];
            const isConfigured = Boolean(stored?.key);

            return (
              <div
                key={pid}
                onClick={() => {
                  setSelectedKeyProvider(pid);
                  setKeyModalOpen(true);
                }}
                className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between ${
                  isConfigured
                    ? "bg-card border-emerald-500/30 shadow-sm"
                    : "bg-card/50 border-border hover:border-fruit-500/40"
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-xs font-bold text-foreground">{meta.name}</span>
                  {isConfigured ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-amber-500/60 shrink-0 mt-1" />
                  )}
                </div>

                <div className="mt-4 pt-2 border-t border-border flex items-center justify-between text-[11px]">
                  <span className={isConfigured ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}>
                    {isConfigured ? `${stored.storageType}` : "Click to set"}
                  </span>
                  <Key className="w-3 h-3 text-muted-foreground" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Signature Prompt Analysis */}
        <Link
          href="/prompt-analysis"
          className="group p-6 rounded-2xl bg-card border border-border hover:border-fruit-500/50 hover:bg-fruit-500/5 transition-all shadow-sm flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-fruit-500/15 border border-fruit-500/25 flex items-center justify-center text-fruit-600 dark:text-fruit-400 group-hover:scale-110 transition-transform">
              <ScanSearch className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-block px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold bg-fruit-500/20 text-fruit-700 dark:text-fruit-300 mb-1">
                Signature Feature
              </div>
              <h3 className="text-lg font-bold text-foreground group-hover:text-fruit-500 transition-colors">
                Prompt Analysis Engine
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Automatically classifies prompts as <strong>Zero-Shot</strong>, <strong>One-Shot</strong>, or{" "}
                <strong>Few-Shot</strong>. Evaluates clarity, specificity, and constraints completely locally with 0 API keys.
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs font-semibold text-fruit-600 dark:text-fruit-400">
            <span>Launch Analyzer</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 2: Model Comparison */}
        <Link
          href="/model-comparison"
          className="group p-6 rounded-2xl bg-card border border-border hover:border-fruit-500/50 hover:bg-fruit-500/5 transition-all shadow-sm flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-fruit-500/15 border border-fruit-500/25 flex items-center justify-center text-fruit-600 dark:text-fruit-400 group-hover:scale-110 transition-transform">
              <Split className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground group-hover:text-fruit-500 transition-colors">
                Multi-Model Comparison
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Benchmark the identical prompt side-by-side across Groq, OpenAI, Claude, and Gemini. Track latency, output tokens,
                and cost per query in real-time.
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs font-semibold text-fruit-600 dark:text-fruit-400">
            <span>Compare Models</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 3: Prompt Library & Versions */}
        <Link
          href="/prompt-library"
          className="group p-6 rounded-2xl bg-card border border-border hover:border-fruit-500/50 hover:bg-fruit-500/5 transition-all shadow-sm flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-fruit-500/15 border border-fruit-500/25 flex items-center justify-center text-fruit-600 dark:text-fruit-400 group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground group-hover:text-fruit-500 transition-colors">
                Versioned Prompt Library
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Save and organize your best system and user prompts with full version history, diff comparison, tags, and one-click
                insertion into the playground.
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs font-semibold text-fruit-600 dark:text-fruit-400">
            <span>Browse Library</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Featured Models Quick Launcher */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Zap className="w-4 h-4 text-fruit-500" /> Popular Models Ready to Run
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {popularModels.map((m) => (
            <Link
              key={m.id}
              href={`/playground?model=${encodeURIComponent(m.id)}`}
              className="p-4 rounded-2xl bg-card border border-border hover:border-fruit-500/50 hover:bg-muted/40 transition-all flex flex-col justify-between group shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-foreground group-hover:text-fruit-500 transition-colors truncate">
                    {m.name}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                    {m.provider}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{m.description}</p>
              </div>

              <div className="mt-4 pt-2.5 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="text-fruit-600 dark:text-fruit-400 font-medium">
                  {m.tokensPerSecEstimate ? `~${m.tokensPerSecEstimate} t/s` : m.speedRating}
                </span>
                <span>{(m.contextWindow / 1000).toFixed(0)}k ctx</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Experiments & Templates Dual Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Experiments */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <History className="w-4 h-4 text-fruit-500" /> Recent Local Experiments
            </h3>
            <Link href="/history" className="text-xs text-fruit-600 dark:text-fruit-400 hover:underline">
              View all ({experiments.length})
            </Link>
          </div>

          {experiments.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-muted/30 border border-dashed border-border text-xs text-muted-foreground">
              No experiments saved yet. Run your first query in the Playground!
            </div>
          ) : (
            <div className="space-y-2">
              {experiments.map((exp) => (
                <Link
                  key={exp.id}
                  href={`/playground?restore=${exp.id}`}
                  className="block p-3 rounded-xl border border-border hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground truncate max-w-[240px]">
                      {exp.title}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {new Date(exp.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                    <span className="font-mono text-fruit-600 dark:text-fruit-400">{exp.model}</span>
                    <span>•</span>
                    <span>{formatNumber(exp.metrics?.totalTokens || 0)} tokens</span>
                    <span>•</span>
                    <span>{formatDuration(exp.metrics?.durationMs || 0)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Starter Templates */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-fruit-500" /> Featured Prompt Templates
            </h3>
            <Link href="/prompt-library" className="text-xs text-fruit-600 dark:text-fruit-400 hover:underline">
              Browse library
            </Link>
          </div>

          <div className="space-y-2">
            {templates.map((tpl) => (
              <Link
                key={tpl.id}
                href={`/playground?template=${tpl.id}`}
                className="block p-3 rounded-xl border border-border hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">{tpl.title}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                    {tpl.category}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                  {tpl.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <ApiKeyModal
        isOpen={keyModalOpen}
        onClose={() => {
          setKeyModalOpen(false);
          setKeys(getAllStoredKeys());
        }}
        defaultProvider={selectedKeyProvider}
        onKeysChanged={() => setKeys(getAllStoredKeys())}
      />
    </div>
  );
}

