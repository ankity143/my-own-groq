"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  History,
  Search,
  Trash2,
  Download,
  ArrowRight,
  Clock,
  Layers,
  DollarSign,
  Copy,
  Terminal,
  Filter,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ExperimentRecord, ProviderId } from "@/types";
import { loadExperiments, deleteExperiment, clearAllLocalData } from "@/lib/storage";
import { useToast } from "@/components/ui/toast";
import { formatNumber, formatCost, formatDuration } from "@/lib/utils";

export default function HistoryPage() {
  const toast = useToast();
  const [experiments, setExperiments] = useState<ExperimentRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setExperiments(loadExperiments());
  }, []);

  const filteredExperiments = useMemo(() => {
    return experiments.filter((exp) => {
      if (providerFilter !== "all" && exp.provider !== providerFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const msgText = exp.messages.map((m) => m.content).join(" ").toLowerCase();
        return (
          exp.title.toLowerCase().includes(q) ||
          exp.model.toLowerCase().includes(q) ||
          exp.systemPrompt.toLowerCase().includes(q) ||
          msgText.includes(q)
        );
      }
      return true;
    });
  }, [experiments, providerFilter, searchQuery]);

  const handleDeleteOne = (id: string) => {
    deleteExperiment(id);
    setExperiments(loadExperiments());
    toast.info("Deleted", "Experiment removed from history.");
  };

  const handleClearAll = () => {
    if (confirm("Are you sure you want to clear all experiment history on this device?")) {
      localStorage.removeItem("fruitai_experiments");
      setExperiments([]);
      toast.info("Cleared", "All local experiments removed.");
    }
  };

  const handleExportHistory = () => {
    const jsonStr = JSON.stringify(experiments, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fruitai-history-export-${Date.now()}.json`;
    a.click();
    toast.success("Export Downloaded", "Full experiment history saved to JSON.");
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to Clipboard", "Response copied.");
  };

  return (
    <div className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-fruit-500/15 border border-fruit-500/30 text-fruit-700 dark:text-fruit-300 text-xs font-semibold mb-2">
            <History className="w-3.5 h-3.5 text-fruit-500" />
            Browser-Local Storage • Never Sent to Server
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Experiment History
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
            Review past multi-turn playground queries, token telemetry, latency benchmarks, and parameter snapshots.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {experiments.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleExportHistory}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-border hover:bg-muted transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Export JSON
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear All
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search experiments by prompt, model, or keywords..."
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-input rounded-xl text-xs outline-none focus:border-fruit-500 focus:ring-1 focus:ring-fruit-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="px-3 py-2 bg-card border border-input rounded-xl text-xs font-medium outline-none focus:border-fruit-500"
          >
            <option value="all">All Providers</option>
            <option value="groq">Groq</option>
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini</option>
            <option value="anthropic">Anthropic</option>
            <option value="openrouter">OpenRouter</option>
          </select>
        </div>
      </div>

      {/* Experiment Records List */}
      {filteredExperiments.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-card border border-border text-muted-foreground space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-fruit-500/10 border border-fruit-500/20 flex items-center justify-center text-fruit-500">
            <History className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-foreground text-sm">No experiments found</h3>
          <p className="text-xs max-w-sm mx-auto leading-relaxed">
            Run requests in the Playground and they will be automatically logged here for offline review.
          </p>
          <Link
            href="/playground"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-fruit-500 text-slate-950 font-bold text-xs"
          >
            Go to Playground <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredExperiments.map((exp) => {
            const isExpanded = expandedId === exp.id;
            const assistantMsg = [...exp.messages].reverse().find((m) => m.role === "assistant");
            const userMsg = exp.messages.find((m) => m.role === "user");

            return (
              <div
                key={exp.id}
                className="p-5 rounded-2xl bg-card border border-border hover:border-fruit-500/30 transition-all shadow-sm space-y-4"
              >
                {/* Header Summary */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-foreground">{exp.title}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase font-semibold">
                        {exp.provider} • {exp.model}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3">
                      <span>{new Date(exp.timestamp).toLocaleString()}</span>
                      <span>•</span>
                      <span>{exp.messages.length} messages</span>
                    </div>
                  </div>

                  {/* Telemetry Pills */}
                  <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-fruit-500" />
                      <span>{formatDuration(exp.metrics?.durationMs || 0)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-fruit-500" />
                      <span>{formatNumber(exp.metrics?.totalTokens || 0)} tok</span>
                    </div>
                    <div className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>{formatCost(exp.metrics?.estimatedCost || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Prompt & Output Preview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-background border border-border space-y-1">
                    <span className="font-bold text-[10px] text-muted-foreground uppercase block font-sans">
                      User Prompt
                    </span>
                    <p className="line-clamp-2 text-foreground font-sans">{userMsg?.content}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-background border border-border space-y-1">
                    <span className="font-bold text-[10px] text-muted-foreground uppercase block font-sans">
                      Assistant Output
                    </span>
                    <p className="line-clamp-2 text-foreground font-sans">
                      {assistantMsg?.content || "No assistant response recorded"}
                    </p>
                  </div>
                </div>

                {/* Expanded Full Details */}
                {isExpanded && (
                  <div className="pt-3 border-t border-border space-y-3 animate-in fade-in text-xs">
                    {exp.systemPrompt && (
                      <div>
                        <span className="font-bold text-muted-foreground block mb-1">
                          System Instructions:
                        </span>
                        <div className="p-3 rounded-xl bg-muted/30 border border-border font-mono">
                          {exp.systemPrompt}
                        </div>
                      </div>
                    )}

                    <div>
                      <span className="font-bold text-muted-foreground block mb-1">
                        Full Conversation Transcript:
                      </span>
                      <div className="space-y-2">
                        {exp.messages.map((m, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border ${
                              m.role === "user"
                                ? "bg-fruit-500/10 border-fruit-500/20"
                                : "bg-card border-border"
                            }`}
                          >
                            <div className="font-bold text-[10px] font-mono uppercase text-muted-foreground mb-1">
                              {m.role}
                            </div>
                            <div className="whitespace-pre-wrap leading-relaxed font-sans">{m.content}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Bar */}
                <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : exp.id)}
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1 font-semibold"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" /> Collapse Details
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" /> View Transcript & Parameters
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDeleteOne(exp.id)}
                      className="p-1 text-muted-foreground hover:text-rose-500 transition-colors"
                      title="Delete this record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <Link
                      href={`/playground?restore=${exp.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-fruit-500/15 text-fruit-700 dark:text-fruit-300 font-bold hover:bg-fruit-500/25 transition-colors"
                    >
                      <Terminal className="w-3 h-3" /> Restore in Playground
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

