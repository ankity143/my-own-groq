"use client";

import React, { useState } from "react";
import {
  Split,
  Play,
  Copy,
  Clock,
  Layers,
  DollarSign,
  Zap,
  Plus,
  Trash2,
  AlertCircle,
  RotateCw,
  Sparkles,
} from "lucide-react";
import { MODEL_REGISTRY, getModelById } from "@/lib/model-registry/models";
import { getStoredKey, isProviderConfigured } from "@/lib/security/key-storage";
import { useToast } from "@/components/ui/toast";
import { ApiKeyModal } from "@/components/byok/api-key-modal";
import { ModelDefinition, GenerationMetrics, ProviderId } from "@/types";
import { formatNumber, formatCost, formatDuration, estimateTokensFromText } from "@/lib/utils";

interface ModelComparisonSlot {
  id: string;
  model: ModelDefinition;
  response: string;
  status: "idle" | "loading" | "done" | "error";
  metrics?: GenerationMetrics;
  error?: string;
}

export default function ModelComparisonPage() {
  const toast = useToast();
  const [prompt, setPrompt] = useState(
    "Explain the architectural differences between Monolithic, Microservices, and Event-Driven systems. Conclude with a comparison table."
  );
  const [systemPrompt, setSystemPrompt] = useState(
    "You are a Principal Software Architect. Give concise, technical, and objective comparisons."
  );

  const [slots, setSlots] = useState<ModelComparisonSlot[]>([
    {
      id: "slot-1",
      model: MODEL_REGISTRY[0], // Groq Llama 3.3 70B
      response: "",
      status: "idle",
    },
    {
      id: "slot-2",
      model: MODEL_REGISTRY[6], // OpenAI GPT-4o
      response: "",
      status: "idle",
    },
    {
      id: "slot-3",
      model: MODEL_REGISTRY[10], // Gemini 1.5 Flash
      response: "",
      status: "idle",
    },
  ]);

  const [isRunningAll, setIsRunningAll] = useState(false);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [targetKeyProvider, setTargetKeyProvider] = useState<ProviderId>("groq");

  const handleAddModelSlot = () => {
    if (slots.length >= 4) {
      toast.info("Slot Limit Reached", "You can compare up to 4 models simultaneously.");
      return;
    }
    // Find an unused model
    const existingIds = new Set(slots.map((s) => s.model.id));
    const nextModel = MODEL_REGISTRY.find((m) => !existingIds.has(m.id)) || MODEL_REGISTRY[1];
    setSlots((prev) => [
      ...prev,
      {
        id: `slot-${Date.now()}`,
        model: nextModel,
        response: "",
        status: "idle",
      },
    ]);
  };

  const handleRemoveSlot = (slotId: string) => {
    if (slots.length <= 2) {
      toast.warning("Minimum 2 Models", "At least two models are required for comparison.");
      return;
    }
    setSlots((prev) => prev.filter((s) => s.id !== slotId));
  };

  const handleChangeModel = (slotId: string, modelId: string) => {
    const newModel = getModelById(modelId);
    if (!newModel) return;
    setSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, model: newModel, response: "", status: "idle" } : s))
    );
  };

  const runSingleModel = async (slot: ModelComparisonSlot): Promise<void> => {
    const stored = getStoredKey(slot.model.provider);
    if (!stored || !stored.key) {
      setSlots((prev) =>
        prev.map((s) =>
          s.id === slot.id
            ? { ...s, status: "error", error: `Missing ${slot.model.provider.toUpperCase()} API key` }
            : s
        )
      );
      return;
    }

    setSlots((prev) =>
      prev.map((s) => (s.id === slot.id ? { ...s, status: "loading", response: "", error: undefined } : s))
    );

    const startTime = performance.now();
    let accumulated = "";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: slot.model.provider,
          model: slot.model.id,
          messages: [{ id: "comp-msg", role: "user", content: prompt, timestamp: Date.now() }],
          systemPrompt,
          parameters: {
            temperature: 0.7,
            maxTokens: 2048,
            topP: 1.0,
            stopSequences: [],
            responseFormat: "text",
          },
          apiKey: stored.key,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            const dataStr = trimmed.slice(6).trim();
            if (dataStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                accumulated += delta;
                setSlots((prev) =>
                  prev.map((s) => (s.id === slot.id ? { ...s, response: accumulated } : s))
                );
              }
            } catch {
              // ignore
            }
          }
        }
      }

      const durationMs = Math.round(performance.now() - startTime);
      const inTokens = estimateTokensFromText(prompt + " " + systemPrompt);
      const outTokens = estimateTokensFromText(accumulated);
      const totalTokens = inTokens + outTokens;
      const tps = durationMs > 0 ? Math.round((outTokens / (durationMs / 1000)) * 10) / 10 : 0;
      const cost =
        (inTokens / 1_000_000) * slot.model.pricing.inputPer1M +
        (outTokens / 1_000_000) * slot.model.pricing.outputPer1M;

      const metrics: GenerationMetrics = {
        promptTokens: inTokens,
        completionTokens: outTokens,
        totalTokens,
        durationMs,
        tokensPerSecond: tps,
        estimatedCost: cost,
      };

      setSlots((prev) =>
        prev.map((s) => (s.id === slot.id ? { ...s, status: "done", metrics } : s))
      );
    } catch (err: any) {
      setSlots((prev) =>
        prev.map((s) => (s.id === slot.id ? { ...s, status: "error", error: err.message } : s))
      );
    }
  };

  const handleRunAll = async () => {
    if (!prompt.trim()) {
      toast.warning("Empty Prompt", "Please enter a prompt to compare.");
      return;
    }

    setIsRunningAll(true);
    // Execute all slots in parallel
    await Promise.all(slots.map((s) => runSingleModel(s)));
    setIsRunningAll(false);
    toast.success("Benchmark Finished", "All models completed generation.");
  };

  const handleCopy = (text: string, modelName: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied", `${modelName} response copied.`);
  };

  return (
    <div className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-fruit-500/15 border border-fruit-500/30 text-fruit-700 dark:text-fruit-300 text-xs font-semibold mb-1.5">
            <Split className="w-3.5 h-3.5 text-fruit-500" />
            Side-by-Side Multi-Model Benchmark
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Model Comparison Arena
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Evaluate output quality, latency, token throughput, and estimated cost across multiple AI models concurrently.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddModelSlot}
            disabled={slots.length >= 4}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-border hover:bg-muted transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Add Model Slot ({slots.length}/4)
          </button>

          <button
            type="button"
            onClick={handleRunAll}
            disabled={isRunningAll || !prompt.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-fruit-500 hover:bg-fruit-600 text-slate-950 shadow-md shadow-fruit-500/20 transition-all disabled:opacity-50"
          >
            {isRunningAll ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" /> Running All...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Run Benchmark Across All
              </>
            )}
          </button>
        </div>
      </div>

      {/* Shared Prompt Input Area */}
      <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Shared Prompt (Executed on each model)
          </label>
          <span className="text-xs font-mono text-muted-foreground">
            ~{estimateTokensFromText(prompt)} input tokens
          </span>
        </div>

        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter prompt to compare across models..."
          className="w-full p-3.5 bg-background border border-input rounded-xl text-xs sm:text-sm font-sans outline-none focus:border-fruit-500 focus:ring-1 focus:ring-fruit-500 resize-y"
        />

        <div className="pt-1">
          <input
            type="text"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Optional shared system instructions..."
            className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs outline-none focus:border-fruit-500"
          />
        </div>
      </div>

      {/* Comparison Grid */}
      <div
        className={`grid gap-4 ${
          slots.length === 2
            ? "grid-cols-1 md:grid-cols-2"
            : slots.length === 3
            ? "grid-cols-1 md:grid-cols-3"
            : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
        }`}
      >
        {slots.map((slot) => {
          const hasKey = isProviderConfigured(slot.model.provider);

          return (
            <div
              key={slot.id}
              className="p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between space-y-4 min-h-[460px]"
            >
              {/* Slot Header */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <select
                    value={slot.model.id}
                    onChange={(e) => handleChangeModel(slot.id, e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-background border border-input rounded-xl text-xs font-bold text-foreground outline-none focus:border-fruit-500"
                  >
                    {MODEL_REGISTRY.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.provider})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => handleRemoveSlot(slot.id)}
                    className="p-1.5 text-muted-foreground hover:text-rose-500 rounded-lg hover:bg-muted transition-colors"
                    title="Remove model slot"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Key check notice */}
                {!hasKey && (
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-900 dark:text-amber-200 flex items-center justify-between">
                    <span>Key missing</span>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetKeyProvider(slot.model.provider);
                        setKeyModalOpen(true);
                      }}
                      className="text-amber-600 dark:text-amber-400 font-bold underline"
                    >
                      Set Key
                    </button>
                  </div>
                )}
              </div>

              {/* Response Output Box */}
              <div className="flex-1 rounded-xl bg-background border border-border p-3.5 overflow-y-auto max-h-[360px] text-xs font-sans whitespace-pre-wrap leading-relaxed">
                {slot.status === "loading" && !slot.response && (
                  <div className="h-full flex items-center justify-center text-muted-foreground gap-2">
                    <RotateCw className="w-4 h-4 animate-spin text-fruit-500" />
                    <span>Streaming response...</span>
                  </div>
                )}

                {slot.status === "error" && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
                    {slot.error}
                  </div>
                )}

                {slot.response ? (
                  slot.response
                ) : (
                  slot.status === "idle" && (
                    <span className="text-muted-foreground italic">
                      Click "Run Benchmark" to execute this model.
                    </span>
                  )
                )}
              </div>

              {/* Metrics & Telemetry Footer */}
              <div className="pt-3 border-t border-border space-y-2">
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-muted-foreground">
                  <div>
                    Latency:{" "}
                    <span className="font-bold text-foreground">
                      {slot.metrics ? formatDuration(slot.metrics.durationMs) : "—"}
                    </span>
                  </div>
                  <div>
                    Speed:{" "}
                    <span className="font-bold text-fruit-600 dark:text-fruit-400">
                      {slot.metrics ? `${slot.metrics.tokensPerSecond} t/s` : slot.model.speedRating}
                    </span>
                  </div>
                  <div>
                    Tokens:{" "}
                    <span className="font-bold text-foreground">
                      {slot.metrics ? formatNumber(slot.metrics.totalTokens) : "—"}
                    </span>
                  </div>
                  <div>
                    Cost:{" "}
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {slot.metrics ? formatCost(slot.metrics.estimatedCost) : "—"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    disabled={!slot.response}
                    onClick={() => handleCopy(slot.response, slot.model.name)}
                    className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 disabled:opacity-40"
                  >
                    <Copy className="w-3 h-3" /> Copy Output
                  </button>

                  <button
                    type="button"
                    disabled={slot.status === "loading"}
                    onClick={() => runSingleModel(slot)}
                    className="text-[11px] text-fruit-600 dark:text-fruit-400 font-bold hover:underline"
                  >
                    Run Solo
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ApiKeyModal
        isOpen={keyModalOpen}
        onClose={() => setKeyModalOpen(false)}
        defaultProvider={targetKeyProvider}
      />
    </div>
  );
}

