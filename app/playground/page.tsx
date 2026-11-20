"use client";

import React, { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Terminal,
  Play,
  Square,
  RotateCw,
  Copy,
  Download,
  Trash2,
  Sparkles,
  Sliders,
  Eye,
  Wrench,
  FileCode,
  Image as ImageIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Share2,
  Code2,
  ScanSearch,
  Zap,
  DollarSign,
  Clock,
  Layers,
  X,
  AlertCircle,
  HelpCircle,
  Plus,
} from "lucide-react";
import { UnifiedModelSelector } from "@/components/model-selector/unified-model-selector";
import { ApiKeyModal } from "@/components/byok/api-key-modal";
import { useToast } from "@/components/ui/toast";
import {
  ModelDefinition,
  ModelParameters,
  Message,
  ProviderId,
  ExperimentRecord,
  GenerationMetrics,
} from "@/types";
import { MODEL_REGISTRY, getModelById } from "@/lib/model-registry/models";
import { getStoredKey, isProviderConfigured } from "@/lib/security/key-storage";
import {
  loadUserSettings,
  saveExperiment,
  loadPromptTemplates,
  loadExperiments,
  DEFAULT_PARAMETERS,
} from "@/lib/storage";
import { analyzePrompt } from "@/lib/prompt-analyzer/classifier";
import {
  formatNumber,
  formatCost,
  formatDuration,
  estimateTokensFromText,
  generateId,
} from "@/lib/utils";

function PlaygroundContent() {
  const toast = useToast();
  const searchParams = useSearchParams();

  // Active Model
  const [selectedModel, setSelectedModel] = useState<ModelDefinition>(() => {
    const queryModel = searchParams.get("model");
    if (queryModel) {
      const found = getModelById(queryModel);
      if (found) return found;
    }
    return MODEL_REGISTRY[0]; // Llama 3.3 70B Versatile
  });

  // System Prompt & Messages
  const [systemPrompt, setSystemPrompt] = useState(
    "You are an expert AI assistant. Provide concise, clear, and insightful answers."
  );
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg-init",
      role: "user",
      content: "Explain how zero-shot and few-shot prompting differ with concrete examples.",
      timestamp: Date.now(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  // Model Parameters
  const [parameters, setParameters] = useState<ModelParameters>(DEFAULT_PARAMETERS);
  const [showAdvancedParams, setShowAdvancedParams] = useState(false);

  // Streaming & Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);

  // Panel layout toggles
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [mobileTab, setMobileTab] = useState<"left" | "center" | "right">("center");

  // BYOK Modal
  const [keyModalOpen, setKeyModalOpen] = useState(false);

  // Current Metrics & Token Estimation
  const [currentMetrics, setCurrentMetrics] = useState<GenerationMetrics>({
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    durationMs: 0,
    tokensPerSecond: 0,
    estimatedCost: 0,
  });

  // Handle URL restores or template injections
  useEffect(() => {
    const restoreId = searchParams.get("restore");
    if (restoreId) {
      const exps = loadExperiments();
      const exp = exps.find((e) => e.id === restoreId);
      if (exp) {
        setSystemPrompt(exp.systemPrompt || "");
        setMessages(exp.messages || []);
        setParameters(exp.parameters || DEFAULT_PARAMETERS);
        const m = getModelById(exp.model);
        if (m) setSelectedModel(m);
        toast.info("Restored Experiment", exp.title);
      }
    }

    const templateId = searchParams.get("template");
    if (templateId) {
      const tpls = loadPromptTemplates();
      const tpl = tpls.find((t) => t.id === templateId);
      if (tpl) {
        setSystemPrompt(tpl.systemPrompt || "");
        setMessages([
          {
            id: generateId(),
            role: "user",
            content: tpl.userPrompt || "",
            timestamp: Date.now(),
          },
        ]);
        toast.info("Loaded Template", tpl.title);
      }
    }
  }, [searchParams, toast]);

  // Realtime Prompt Analysis of the active prompt
  const activePromptText = useMemo(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    return lastUser ? lastUser.content : inputMessage;
  }, [messages, inputMessage]);

  const liveAnalysis = useMemo(() => {
    return analyzePrompt(activePromptText, systemPrompt);
  }, [activePromptText, systemPrompt]);

  // Calculate live input token estimation
  const estimatedInputTokens = useMemo(() => {
    let text = systemPrompt;
    for (const m of messages) {
      text += " " + m.content;
    }
    return estimateTokensFromText(text);
  }, [systemPrompt, messages]);

  // Check if provider has active key
  const hasKey = isProviderConfigured(selectedModel.provider);

  // Send / Stream Generation
  const handleGenerate = async (messagesToSend?: Message[]) => {
    const stored = getStoredKey(selectedModel.provider);
    if (!stored || !stored.key) {
      setKeyModalOpen(true);
      toast.warning("API Key Required", `Please configure your ${selectedModel.provider} API key to execute.`);
      return;
    }

    const history = messagesToSend || messages;
    if (history.length === 0) return;

    setIsGenerating(true);
    setStreamingContent("");
    startTimeRef.current = performance.now();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let accumulated = "";
    let chunkCount = 0;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          provider: selectedModel.provider,
          model: selectedModel.id,
          messages: history,
          systemPrompt,
          parameters,
          apiKey: stored.key,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP error ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream available");

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
                chunkCount++;
                setStreamingContent(accumulated);
              }
            } catch {
              // Ignore partial JSON
            }
          }
        }
      }

      const elapsedMs = Math.round(performance.now() - startTimeRef.current);
      const outTokens = estimateTokensFromText(accumulated);
      const inTokens = estimatedInputTokens;
      const totalTokens = inTokens + outTokens;
      const tps = elapsedMs > 0 ? Math.round((outTokens / (elapsedMs / 1000)) * 10) / 10 : 0;
      const cost =
        (inTokens / 1_000_000) * selectedModel.pricing.inputPer1M +
        (outTokens / 1_000_000) * selectedModel.pricing.outputPer1M;

      const metrics: GenerationMetrics = {
        promptTokens: inTokens,
        completionTokens: outTokens,
        totalTokens,
        durationMs: elapsedMs,
        tokensPerSecond: tps,
        estimatedCost: cost,
      };

      setCurrentMetrics(metrics);

      // Append assistant message to chat
      const assistantMsg: Message = {
        id: generateId(),
        role: "assistant",
        content: accumulated,
        timestamp: Date.now(),
        metrics,
      };

      const updatedHistory = [...history, assistantMsg];
      setMessages(updatedHistory);
      setStreamingContent("");

      // Auto save experiment if enabled
      saveExperiment({
        id: generateId(),
        title: history[history.length - 1]?.content.slice(0, 45) || "Playground Run",
        timestamp: Date.now(),
        provider: selectedModel.provider,
        model: selectedModel.id,
        systemPrompt,
        messages: updatedHistory,
        parameters,
        metrics,
        tags: [selectedModel.provider, selectedModel.id],
      });
    } catch (err: any) {
      if (err.name === "AbortError") {
        toast.info("Generation Stopped", "Request aborted by user.");
      } else {
        toast.error("Generation Failed", err.message || "An unexpected error occurred.");
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim() && uploadedImages.length === 0) return;

    const newMsg: Message = {
      id: generateId(),
      role: "user",
      content: inputMessage.trim(),
      timestamp: Date.now(),
      images: uploadedImages.length > 0 ? uploadedImages : undefined,
    };

    const newHistory = [...messages, newMsg];
    setMessages(newHistory);
    setInputMessage("");
    setUploadedImages([]);
    handleGenerate(newHistory);
  };

  const handleRegenerate = () => {
    if (messages.length === 0) return;
    // Remove last assistant message if present
    const last = messages[messages.length - 1];
    const history = last.role === "assistant" ? messages.slice(0, -1) : messages;
    setMessages(history);
    handleGenerate(history);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image too large", "Images must be under 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setUploadedImages((prev) => [...prev, ev.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleExportJSON = () => {
    const data = JSON.stringify(
      {
        model: selectedModel.id,
        provider: selectedModel.provider,
        systemPrompt,
        messages,
        parameters,
        metrics: currentMetrics,
      },
      null,
      2
    );
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fruitai-experiment-${Date.now()}.json`;
    a.click();
    toast.success("Experiment Exported", "Downloaded JSON file.");
  };

  const handleCopy = (text: string, label = "Response") => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to Clipboard", `${label} copied.`);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      {/* Mobile Tabs Switcher */}
      <div className="md:hidden flex border-b border-border bg-card">
        <button
          onClick={() => setMobileTab("left")}
          className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            mobileTab === "left"
              ? "border-fruit-500 text-fruit-600 dark:text-fruit-400"
              : "border-transparent text-muted-foreground"
          }`}
        >
          Model & Params
        </button>
        <button
          onClick={() => setMobileTab("center")}
          className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            mobileTab === "center"
              ? "border-fruit-500 text-fruit-600 dark:text-fruit-400"
              : "border-transparent text-muted-foreground"
          }`}
        >
          Playground Chat
        </button>
        <button
          onClick={() => setMobileTab("right")}
          className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            mobileTab === "right"
              ? "border-fruit-500 text-fruit-600 dark:text-fruit-400"
              : "border-transparent text-muted-foreground"
          }`}
        >
          Analysis & Stats
        </button>
      </div>

      {/* 3-Panel Desktop Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* ================= LEFT PANEL: MODEL & PARAMS ================= */}
        <div
          className={`border-r border-border bg-card flex flex-col transition-all duration-300 ${
            mobileTab === "left" ? "flex-1" : "hidden md:flex"
          } ${leftPanelOpen ? "w-full md:w-[320px] lg:w-[340px]" : "w-[48px]"}`}
        >
          {leftPanelOpen ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-fruit-500" />
                  <span className="font-bold text-sm text-foreground">Model & Settings</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLeftPanelOpen(false)}
                  className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground hidden md:block"
                  title="Collapse panel"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* Unified Model Selector */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                    Model
                  </label>
                  <UnifiedModelSelector
                    selectedModelId={selectedModel.id}
                    onSelectModel={(m) => setSelectedModel(m)}
                    onOpenKeyModal={() => setKeyModalOpen(true)}
                  />
                </div>

                {/* System Prompt Editor */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      System Instructions
                    </label>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {estimateTokensFromText(systemPrompt)} tok
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="Enter instructions that steer the model's behavior..."
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs font-sans outline-none focus:border-fruit-500 focus:ring-1 focus:ring-fruit-500 resize-y"
                  />
                </div>

                {/* Parameters */}
                <div className="space-y-4 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Parameters
                    </span>
                    <button
                      type="button"
                      onClick={() => setParameters(DEFAULT_PARAMETERS)}
                      className="text-[10px] text-fruit-600 dark:text-fruit-400 hover:underline"
                    >
                      Reset Defaults
                    </button>
                  </div>

                  {/* Temperature */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">Temperature</span>
                      <span className="font-mono text-fruit-600 dark:text-fruit-400 font-bold">
                        {parameters.temperature}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={2}
                      step={0.05}
                      value={parameters.temperature}
                      onChange={(e) =>
                        setParameters({ ...parameters, temperature: parseFloat(e.target.value) })
                      }
                      className="w-full accent-fruit-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>0.0 Precise</span>
                      <span>1.0 Creative</span>
                      <span>2.0 Random</span>
                    </div>
                  </div>

                  {/* Max Output Tokens */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">Max Output Tokens</span>
                      <span className="font-mono text-fruit-600 dark:text-fruit-400 font-bold">
                        {parameters.maxTokens}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={128}
                      max={Math.min(8192, selectedModel.maxOutputTokens)}
                      step={128}
                      value={parameters.maxTokens}
                      onChange={(e) =>
                        setParameters({ ...parameters, maxTokens: parseInt(e.target.value) })
                      }
                      className="w-full accent-fruit-500 cursor-pointer"
                    />
                  </div>

                  {/* Top P */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">Top P (Nucleus Sampling)</span>
                      <span className="font-mono text-fruit-600 dark:text-fruit-400 font-bold">
                        {parameters.topP}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.05}
                      max={1}
                      step={0.05}
                      value={parameters.topP}
                      onChange={(e) =>
                        setParameters({ ...parameters, topP: parseFloat(e.target.value) })
                      }
                      className="w-full accent-fruit-500 cursor-pointer"
                    />
                  </div>

                  {/* Response Format / JSON Mode */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground block">Response Format</label>
                    <select
                      value={parameters.responseFormat}
                      onChange={(e) =>
                        setParameters({
                          ...parameters,
                          responseFormat: e.target.value as any,
                        })
                      }
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs outline-none focus:border-fruit-500"
                    >
                      <option value="text">Text (Default)</option>
                      <option value="json_object">JSON Mode (Strict Object)</option>
                      <option value="json_schema">JSON Schema (Guaranteed Schema)</option>
                    </select>
                  </div>

                  {parameters.responseFormat === "json_schema" && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-muted-foreground">JSON Schema</label>
                      <textarea
                        rows={4}
                        value={parameters.jsonSchema || '{\n  "type": "object",\n  "properties": {\n    "result": { "type": "string" }\n  }\n}'}
                        onChange={(e) =>
                          setParameters({ ...parameters, jsonSchema: e.target.value })
                        }
                        className="w-full p-2 bg-background border border-input rounded-lg font-mono text-[11px] outline-none"
                      />
                    </div>
                  )}

                  {/* Advanced Parameters Accordion */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedParams(!showAdvancedParams)}
                      className="w-full text-xs font-semibold text-fruit-600 dark:text-fruit-400 flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                    >
                      <span>{showAdvancedParams ? "Hide" : "Show"} Advanced Controls</span>
                      <span>{showAdvancedParams ? "−" : "+"}</span>
                    </button>

                    {showAdvancedParams && (
                      <div className="space-y-3 pt-2 text-xs">
                        <div>
                          <label className="text-muted-foreground block mb-1">Stop Sequences (comma-separated)</label>
                          <input
                            type="text"
                            placeholder="e.g. END, ###"
                            value={parameters.stopSequences.join(", ")}
                            onChange={(e) =>
                              setParameters({
                                ...parameters,
                                stopSequences: e.target.value
                                  .split(",")
                                  .map((s) => s.trim())
                                  .filter(Boolean),
                              })
                            }
                            className="w-full px-2.5 py-1.5 bg-background border border-input rounded-lg text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-muted-foreground block mb-1">Seed (Determinism)</label>
                          <input
                            type="number"
                            placeholder="Optional integer"
                            value={parameters.seed ?? ""}
                            onChange={(e) =>
                              setParameters({
                                ...parameters,
                                seed: e.target.value ? parseInt(e.target.value) : undefined,
                              })
                            }
                            className="w-full px-2.5 py-1.5 bg-background border border-input rounded-lg text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center pt-4">
              <button
                type="button"
                onClick={() => setLeftPanelOpen(true)}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                title="Expand model panel"
              >
                <ChevronRight className="w-5 h-5 text-fruit-500" />
              </button>
            </div>
          )}
        </div>

        {/* ================= CENTER PANEL: CHAT & PROMPT ================= */}
        <div
          className={`flex-1 flex flex-col bg-background overflow-hidden ${
            mobileTab === "center" ? "flex" : "hidden md:flex"
          }`}
        >
          {/* Top Control Bar */}
          <div className="p-3 border-b border-border bg-card/40 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-fruit-500" />
                Playground Session
              </span>
              <span className="text-xs text-muted-foreground">({messages.length} messages)</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setMessages([])}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-xs transition-colors flex items-center gap-1"
                title="Clear conversation"
              >
                <Trash2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Clear</span>
              </button>

              <button
                type="button"
                onClick={handleRegenerate}
                disabled={isGenerating || messages.length === 0}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-xs transition-colors flex items-center gap-1 disabled:opacity-50"
                title="Regenerate response"
              >
                <RotateCw className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Regenerate</span>
              </button>

              <button
                type="button"
                onClick={handleExportJSON}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-xs transition-colors flex items-center gap-1"
                title="Download JSON export"
              >
                <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>

          {/* Conversation Stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.length === 0 && !isGenerating && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto text-muted-foreground space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-fruit-500/10 border border-fruit-500/20 flex items-center justify-center text-fruit-500">
                  <Terminal className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-foreground text-sm">Conversation is empty</h3>
                <p className="text-xs leading-relaxed">
                  Enter a prompt below or pick a template to start testing {selectedModel.name}.
                </p>
              </div>
            )}

            {messages.map((msg, index) => {
              const isUser = msg.role === "user";

              return (
                <div
                  key={msg.id || index}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 shadow-sm text-sm space-y-2 ${
                      isUser
                        ? "bg-fruit-500/15 border border-fruit-500/25 text-foreground rounded-tr-none"
                        : "bg-card border border-border text-foreground rounded-tl-none"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between gap-4 text-[10px] font-mono text-muted-foreground mb-1">
                      <span className="font-bold uppercase tracking-wider">
                        {isUser ? "You" : selectedModel.name}
                      </span>
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {/* Multimodal Images */}
                    {msg.images && msg.images.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {msg.images.map((img, i) => (
                          <img
                            key={i}
                            src={img}
                            alt="Uploaded"
                            className="w-24 h-24 object-cover rounded-lg border border-border"
                          />
                        ))}
                      </div>
                    )}

                    {/* Content */}
                    <div className="whitespace-pre-wrap leading-relaxed font-sans">{msg.content}</div>

                    {/* Assistant Metrics */}
                    {msg.metrics && (
                      <div className="pt-2 border-t border-border flex items-center justify-between text-[10px] font-mono text-muted-foreground gap-2">
                        <span>
                          {msg.metrics.completionTokens} tokens ({msg.metrics.tokensPerSecond} t/s)
                        </span>
                        <span>{formatCost(msg.metrics.estimatedCost)}</span>
                      </div>
                    )}
                  </div>

                  {/* Message Action Bar */}
                  <div className="flex items-center gap-2 mt-1 px-1">
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.content)}
                      className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Live Streaming Chunk */}
            {isGenerating && (
              <div className="flex flex-col items-start animate-in fade-in">
                <div className="max-w-[85%] rounded-2xl p-4 bg-card border border-fruit-500/40 text-foreground rounded-tl-none shadow-md space-y-2">
                  <div className="flex items-center justify-between gap-4 text-[10px] font-mono text-fruit-600 dark:text-fruit-400 mb-1">
                    <span className="font-bold uppercase flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-fruit-500 animate-ping" />
                      {selectedModel.name} (Streaming...)
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed font-sans">
                    {streamingContent || "Thinking..."}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Prompt Input Area */}
          <div className="p-4 border-t border-border bg-card">
            {/* Uploaded Images Preview */}
            {uploadedImages.length > 0 && (
              <div className="flex items-center gap-2 pb-2">
                {uploadedImages.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={img}
                      alt="Upload preview"
                      className="w-16 h-16 object-cover rounded-xl border border-border"
                    />
                    <button
                      type="button"
                      onClick={() => setUploadedImages((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-1.5 -right-1.5 p-1 bg-rose-600 text-white rounded-full shadow"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative">
              <textarea
                rows={3}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={`Ask ${selectedModel.name} something (Press Enter to send, Shift+Enter for newline)...`}
                className="w-full p-3.5 pr-28 bg-background border border-input rounded-2xl text-xs sm:text-sm font-sans outline-none focus:border-fruit-500 focus:ring-1 focus:ring-fruit-500 resize-none shadow-inner"
              />

              {/* Input Action Controls */}
              <div className="absolute right-3 bottom-3 flex items-center gap-2">
                {/* Vision Upload Trigger */}
                <label className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors">
                  <ImageIcon className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>

                {/* Generate / Stop Button */}
                {isGenerating ? (
                  <button
                    type="button"
                    onClick={handleStop}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" /> Stop
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() && uploadedImages.length === 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-fruit-500 hover:bg-fruit-600 text-slate-950 text-xs font-bold shadow-md shadow-fruit-500/20 transition-all disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Run
                  </button>
                )}
              </div>
            </div>

            {/* Prompt Token live hint */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2 px-1">
              <span>
                Estimated input: <strong>~{estimatedInputTokens}</strong> tokens
              </span>
              <span className="text-fruit-600 dark:text-fruit-400 font-medium">
                {liveAnalysis.technique.toUpperCase()} Prompting Detected
              </span>
            </div>
          </div>
        </div>

        {/* ================= RIGHT PANEL: ANALYSIS, TOKENS & COST ================= */}
        <div
          className={`border-l border-border bg-card flex flex-col transition-all duration-300 ${
            mobileTab === "right" ? "flex-1" : "hidden lg:flex"
          } ${rightPanelOpen ? "w-full md:w-[320px] lg:w-[340px]" : "w-[48px]"}`}
        >
          {rightPanelOpen ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ScanSearch className="w-4 h-4 text-fruit-500" />
                  <span className="font-bold text-sm text-foreground">Live Telemetry & Analysis</span>
                </div>
                <button
                  type="button"
                  onClick={() => setRightPanelOpen(false)}
                  className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground hidden lg:block"
                  title="Collapse panel"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* 1. Prompt Classification Badge (Zero/One/Few Shot) */}
                <div className="p-4 rounded-2xl bg-fruit-500/10 border border-fruit-500/25 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-fruit-700 dark:text-fruit-300">
                      Detected Technique
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-fruit-500 text-slate-950 font-bold">
                      {liveAnalysis.confidence}% Conf.
                    </span>
                  </div>

                  <div className="text-lg font-extrabold text-foreground capitalize">
                    {liveAnalysis.technique} Prompting
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {liveAnalysis.explanation}
                  </p>

                  {liveAnalysis.demonstrationsCount > 0 && (
                    <div className="pt-2 border-t border-fruit-500/20 text-xs font-semibold text-fruit-700 dark:text-fruit-300">
                      {liveAnalysis.demonstrationsCount} Demonstration
                      {liveAnalysis.demonstrationsCount > 1 ? "s" : ""} verified
                    </div>
                  )}
                </div>

                {/* 2. Prompt Quality Score Gauge */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">Prompt Quality Score</span>
                    <span className="font-mono font-bold text-fruit-600 dark:text-fruit-400 text-sm">
                      {liveAnalysis.qualityScore.overall} / 100
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-fruit-500 rounded-full transition-all duration-500"
                      style={{ width: `${liveAnalysis.qualityScore.overall}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] text-muted-foreground">
                    <div>Clarity: {liveAnalysis.qualityScore.clarity}%</div>
                    <div>Specificity: {liveAnalysis.qualityScore.specificity}%</div>
                    <div>Constraints: {liveAnalysis.qualityScore.constraints}%</div>
                    <div>Output Format: {liveAnalysis.qualityScore.outputFormat}%</div>
                  </div>
                </div>

                {/* 3. Performance & Token Usage */}
                <div className="space-y-3 pt-3 border-t border-border">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                    Execution Telemetry
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Duration */}
                    <div className="p-3 rounded-xl bg-muted/40 border border-border">
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3 text-fruit-500" /> Latency
                      </div>
                      <div className="text-base font-bold font-mono text-foreground mt-1">
                        {currentMetrics.durationMs ? formatDuration(currentMetrics.durationMs) : "—"}
                      </div>
                    </div>

                    {/* Speed */}
                    <div className="p-3 rounded-xl bg-muted/40 border border-border">
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Zap className="w-3 h-3 text-fruit-500" /> Speed
                      </div>
                      <div className="text-base font-bold font-mono text-foreground mt-1">
                        {currentMetrics.tokensPerSecond
                          ? `${currentMetrics.tokensPerSecond} t/s`
                          : selectedModel.speedRating}
                      </div>
                    </div>

                    {/* Tokens */}
                    <div className="p-3 rounded-xl bg-muted/40 border border-border">
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Layers className="w-3 h-3 text-fruit-500" /> Total Tokens
                      </div>
                      <div className="text-base font-bold font-mono text-foreground mt-1">
                        {currentMetrics.totalTokens ? formatNumber(currentMetrics.totalTokens) : "—"}
                      </div>
                    </div>

                    {/* Estimated Cost */}
                    <div className="p-3 rounded-xl bg-muted/40 border border-border">
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-fruit-500" /> Query Cost
                      </div>
                      <div className="text-base font-bold font-mono text-foreground mt-1 text-emerald-600 dark:text-emerald-400">
                        {formatCost(currentMetrics.estimatedCost)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Model Pricing Catalog Reference */}
                <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1.5 text-xs text-muted-foreground">
                  <div className="font-semibold text-foreground flex items-center justify-between">
                    <span>{selectedModel.name} Rates</span>
                    <span className="font-mono text-[10px] uppercase">{selectedModel.provider}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span>Input tokens:</span>
                    <span className="font-mono">${selectedModel.pricing.inputPer1M} / 1M</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span>Output tokens:</span>
                    <span className="font-mono">${selectedModel.pricing.outputPer1M} / 1M</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center pt-4">
              <button
                type="button"
                onClick={() => setRightPanelOpen(true)}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                title="Expand telemetry panel"
              >
                <ChevronLeft className="w-5 h-5 text-fruit-500" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* BYOK Modal Trigger */}
      <ApiKeyModal
        isOpen={keyModalOpen}
        onClose={() => setKeyModalOpen(false)}
        defaultProvider={selectedModel.provider}
      />
    </div>
  );
}

export default function PlaygroundPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-8 text-muted-foreground text-sm">
          Loading FruitAI Playground...
        </div>
      }
    >
      <PlaygroundContent />
    </Suspense>
  );
}
