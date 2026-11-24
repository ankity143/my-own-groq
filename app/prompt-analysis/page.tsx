"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  ScanSearch,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Copy,
  ArrowRight,
  RotateCcw,
  Sliders,
  Check,
  Zap,
  Info,
  ExternalLink,
  Loader2,
  FileText,
} from "lucide-react";
import { analyzePrompt } from "@/lib/prompt-analyzer/classifier";
import { useToast } from "@/components/ui/toast";
import { ApiKeyModal } from "@/components/byok/api-key-modal";
import { getStoredKey } from "@/lib/security/key-storage";
import { MODEL_REGISTRY } from "@/lib/model-registry/models";

const SAMPLE_PROMPTS = {
  zeroShot: `Analyze the security implications of utilizing WebAssembly (WASM) in browser extensions. Focus on memory isolation, DOM access restrictions, and CSP bypassing vectors. Output your findings as a markdown table with risk levels.`,

  oneShot: `Translate the user request into an SQLite query.

Input: "Find all users registered after June 2026 who have placed more than 3 orders"
Output: SELECT u.id, u.name FROM users u JOIN orders o ON u.id = o.user_id WHERE u.created_at > '2026-06-01' GROUP BY u.id HAVING COUNT(o.id) > 3;

Input: "List products that are out of stock and belong to category 'Electronics'"
Output:`,

  fewShot: `Classify the sentiment of financial earnings call statements into Bullish, Bearish, or Neutral.

Example 1:
Input: "Gross margins expanded by 340 bps year-over-year driven by operational efficiencies."
Output: Bullish

Example 2:
Input: "We are revising full-year revenue guidance downward by 8% due to macroeconomic headwinds."
Output: Bearish

Example 3:
Input: "Capital expenditures remained flat at $450 million in line with previous quarters."
Output: Neutral

Input: "Demand for our flagship enterprise suite accelerated across EMEA and APAC regions."
Output:`,

  ambiguous: `Provide a good summary of modern machine learning algorithms. For example, explain neural networks, transformers, and random forests for simple readers quickly.`,
};

export default function PromptAnalysisPage() {
  const toast = useToast();
  const [promptText, setPromptText] = useState(SAMPLE_PROMPTS.oneShot);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [isImprovingWithAI, setIsImprovingWithAI] = useState(false);
  const [aiImprovedResult, setAiImprovedResult] = useState<{
    improvedPrompt: string;
    rationale: string;
  } | null>(null);
  const [keyModalOpen, setKeyModalOpen] = useState(false);

  // Instant local classification
  const analysis = useMemo(() => {
    return analyzePrompt(promptText, systemPrompt);
  }, [promptText, systemPrompt]);

  const activeImprovedPrompt = aiImprovedResult?.improvedPrompt || analysis.improvedPrompt;
  const activeRationale = aiImprovedResult?.rationale || analysis.improvementRationale;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to Clipboard", `${label} copied.`);
  };

  const handleImproveWithAI = async () => {
    // Check if user has an active key for Groq or OpenAI
    const groqKey = getStoredKey("groq");
    const openaiKey = getStoredKey("openai");
    const activeProvider = groqKey ? "groq" : openaiKey ? "openai" : null;
    const activeKey = groqKey?.key || openaiKey?.key;

    if (!activeProvider || !activeKey) {
      toast.info("BYOK Required for AI Rewrite", "Please configure a Groq or OpenAI API key to run deep AI rewriting.");
      setKeyModalOpen(true);
      return;
    }

    setIsImprovingWithAI(true);
    try {
      const res = await fetch("/api/improve-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          systemPrompt,
          provider: activeProvider,
          model: activeProvider === "groq" ? "llama-3.3-70b-versatile" : "gpt-4o-mini",
          apiKey: activeKey,
        }),
      });

      if (!res.ok) {
        throw new Error("AI rewrite failed");
      }

      const data = await res.json();
      setAiImprovedResult({
        improvedPrompt: data.improvedPrompt,
        rationale: data.rationale,
      });
      toast.success("AI Prompt Rewrite Complete", "Enhanced with " + activeProvider.toUpperCase());
    } catch (err: any) {
      toast.error("AI Rewrite Error", err.message);
    } finally {
      setIsImprovingWithAI(false);
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-fruit-500/15 border border-fruit-500/30 text-fruit-700 dark:text-fruit-300 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-fruit-500" />
            AnkIt Signature Engine • 100% Client-Side Local Classifier
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Prompt Analysis & Diagnostics
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
            Detects zero-shot, one-shot, and few-shot structures, separates true demonstrations from illustrative examples,
            evaluates clarity and constraints, and produces optimized prompt rewrites.
          </p>
        </div>

        <Link
          href={`/playground?restorePrompt=${encodeURIComponent(promptText)}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-fruit-500 hover:bg-fruit-600 text-slate-950 font-bold text-xs shadow-md transition-all shrink-0"
        >
          Open in Playground <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Preset Sample Quick Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-muted-foreground font-semibold shrink-0">Try Presets:</span>
        <button
          type="button"
          onClick={() => {
            setPromptText(SAMPLE_PROMPTS.zeroShot);
            setAiImprovedResult(null);
          }}
          className="px-3 py-1.5 rounded-lg border border-border hover:border-fruit-500 hover:bg-muted font-medium transition-colors shrink-0"
        >
          Zero-Shot Prompt
        </button>
        <button
          type="button"
          onClick={() => {
            setPromptText(SAMPLE_PROMPTS.oneShot);
            setAiImprovedResult(null);
          }}
          className="px-3 py-1.5 rounded-lg border border-border hover:border-fruit-500 hover:bg-muted font-medium transition-colors shrink-0"
        >
          One-Shot Prompt (1 Pair)
        </button>
        <button
          type="button"
          onClick={() => {
            setPromptText(SAMPLE_PROMPTS.fewShot);
            setAiImprovedResult(null);
          }}
          className="px-3 py-1.5 rounded-lg border border-border hover:border-fruit-500 hover:bg-muted font-medium transition-colors shrink-0"
        >
          Few-Shot Prompt (3 Pairs)
        </button>
        <button
          type="button"
          onClick={() => {
            setPromptText(SAMPLE_PROMPTS.ambiguous);
            setAiImprovedResult(null);
          }}
          className="px-3 py-1.5 rounded-lg border border-border hover:border-fruit-500 hover:bg-muted font-medium transition-colors shrink-0 text-amber-600 dark:text-amber-400"
        >
          Ambiguous Example Check
        </button>
      </div>

      {/* Editor & Primary Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Prompt Input */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-5 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-fruit-500" /> Target Prompt Under Analysis
              </label>
              <button
                type="button"
                onClick={() => setPromptText("")}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>

            <textarea
              rows={12}
              value={promptText}
              onChange={(e) => {
                setPromptText(e.target.value);
                setAiImprovedResult(null);
              }}
              placeholder="Paste or write your prompt here..."
              className="w-full p-4 bg-background border border-input rounded-xl text-xs sm:text-sm font-mono outline-none focus:border-fruit-500 focus:ring-1 focus:ring-fruit-500 leading-relaxed resize-y"
            />

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                Optional System Context
              </label>
              <input
                type="text"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="e.g. You are a Senior Security Engineer..."
                className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs outline-none focus:border-fruit-500"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Classification & Quality Score Cards */}
        <div className="lg:col-span-6 space-y-4">
          {/* Technique Classification Box */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-fruit-500/15 via-fruit-500/5 to-transparent border border-fruit-500/30 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-fruit-700 dark:text-fruit-300">
                Primary Prompt Classification
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-fruit-500 text-slate-950 shadow-sm">
                {analysis.confidence}% Confidence
              </span>
            </div>

            <div className="text-3xl font-black text-foreground capitalize tracking-tight">
              {analysis.technique} Prompting
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {analysis.explanation}
            </p>

            {analysis.ambiguityWarnings.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200/90 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Ambiguity Warning
                </div>
                {analysis.ambiguityWarnings.map((w, i) => (
                  <p key={i}>{w}</p>
                ))}
              </div>
            )}
          </div>

          {/* Quality Score Breakdown */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Prompt Quality Metrics</h3>
              <span className="text-lg font-mono font-black text-fruit-600 dark:text-fruit-400">
                {analysis.qualityScore.overall} / 100
              </span>
            </div>

            {/* Overall Progress Bar */}
            <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-fruit-500 rounded-full transition-all duration-500"
                style={{ width: `${analysis.qualityScore.overall}%` }}
              />
            </div>

            {/* Sub-Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-center">
                <span className="text-[10px] text-muted-foreground uppercase block">Clarity</span>
                <span className="text-sm font-bold font-mono">{analysis.qualityScore.clarity}%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-center">
                <span className="text-[10px] text-muted-foreground uppercase block">Specificity</span>
                <span className="text-sm font-bold font-mono">{analysis.qualityScore.specificity}%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-center">
                <span className="text-[10px] text-muted-foreground uppercase block">Constraints</span>
                <span className="text-sm font-bold font-mono">{analysis.qualityScore.constraints}%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-center">
                <span className="text-[10px] text-muted-foreground uppercase block">Format</span>
                <span className="text-sm font-bold font-mono">{analysis.qualityScore.outputFormat}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Demonstrations & Advanced Techniques Detail Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Verified Demonstrations Evidence */}
        <div className="lg:col-span-6 p-6 rounded-2xl bg-card border border-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-fruit-500" />
              Verified Demonstrations ({analysis.demonstrationsCount})
            </h3>
            <span className="text-xs text-muted-foreground font-mono">
              {analysis.technique === "zero-shot" ? "0 Pairs" : `${analysis.demonstrationsCount} Demonstration Pair(s)`}
            </span>
          </div>

          {analysis.demonstrationsCount === 0 ? (
            <div className="p-6 rounded-xl bg-muted/30 border border-dashed border-border text-xs text-muted-foreground text-center">
              No input-output pairs detected. Task will be performed zero-shot.
            </div>
          ) : (
            <div className="space-y-3">
              {analysis.demonstrations.map((demo, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-background border border-border text-xs space-y-2">
                  <div className="font-bold text-fruit-600 dark:text-fruit-400 font-mono text-[11px]">
                    Demonstration #{idx + 1}
                  </div>
                  <div>
                    <span className="font-bold text-muted-foreground">Input: </span>
                    <span className="font-mono text-foreground">{demo.input}</span>
                  </div>
                  <div>
                    <span className="font-bold text-muted-foreground">Expected Output: </span>
                    <span className="font-mono text-foreground">{demo.output}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Advanced Techniques Detected */}
        <div className="lg:col-span-6 p-6 rounded-2xl bg-card border border-border space-y-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Zap className="w-4 h-4 text-fruit-500" /> Advanced Prompting Techniques
          </h3>

          <div className="space-y-2">
            {analysis.detectedTechniques.map((tech) => (
              <div
                key={tech.name}
                className={`p-3 rounded-xl border transition-colors flex items-start justify-between gap-3 ${
                  tech.detected
                    ? "bg-fruit-500/10 border-fruit-500/30 text-foreground"
                    : "bg-muted/30 border-border text-muted-foreground opacity-75"
                }`}
              >
                <div>
                  <div className="text-xs font-bold flex items-center gap-2">
                    {tech.name}
                    {tech.detected && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-fruit-500 text-slate-950 font-bold">
                        Detected
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] mt-0.5">{tech.description}</p>
                  {tech.evidence && (
                    <div className="text-[10px] font-mono text-fruit-600 dark:text-fruit-400 mt-1">
                      {tech.evidence}
                    </div>
                  )}
                </div>
                {tech.detected && <Check className="w-4 h-4 text-fruit-500 shrink-0 mt-0.5" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Side-by-Side Prompt Improvement & Rewriting Section */}
      <div className="p-6 rounded-3xl bg-card border border-border shadow-lg space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-fruit-500" /> Side-by-Side Prompt Optimization
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Compare the original prompt with AnkIt's structurally enhanced revision.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isImprovingWithAI}
              onClick={handleImproveWithAI}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-muted border border-border hover:border-fruit-500 text-foreground transition-all disabled:opacity-50"
            >
              {isImprovingWithAI && <Loader2 className="w-3.5 h-3.5 animate-spin text-fruit-500" />}
              Improve with BYOK AI Model
            </button>

            <button
              type="button"
              onClick={() => {
                setPromptText(activeImprovedPrompt);
                toast.success("Applied to Editor", "Original prompt replaced with optimized version.");
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-fruit-500 hover:bg-fruit-600 text-slate-950 shadow-md transition-all"
            >
              <Check className="w-3.5 h-3.5" /> Replace Original
            </button>
          </div>
        </div>

        {/* Improvement Rationale Banner */}
        <div className="p-3.5 rounded-xl bg-fruit-500/10 border border-fruit-500/20 text-xs text-fruit-900 dark:text-fruit-200">
          <span className="font-bold">Optimization Rationale: </span>
          {activeRationale}
        </div>

        {/* Side-by-Side View */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Original */}
          <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-muted-foreground mb-2">
                <span>ORIGINAL PROMPT</span>
                <button
                  type="button"
                  onClick={() => handleCopy(promptText, "Original Prompt")}
                  className="hover:text-foreground flex items-center gap-1 text-[11px]"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
              <pre className="p-3 rounded-xl bg-background border border-border font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto">
                {promptText}
              </pre>
            </div>
          </div>

          {/* Improved */}
          <div className="p-4 rounded-2xl bg-fruit-500/5 border border-fruit-500/30 space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-fruit-700 dark:text-fruit-300 mb-2">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-fruit-500" /> OPTIMIZED PROMPT
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(activeImprovedPrompt, "Optimized Prompt")}
                  className="hover:text-foreground flex items-center gap-1 text-[11px]"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
              <pre className="p-3 rounded-xl bg-background border border-border font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto">
                {activeImprovedPrompt}
              </pre>
            </div>
          </div>
        </div>
      </div>

      <ApiKeyModal
        isOpen={keyModalOpen}
        onClose={() => setKeyModalOpen(false)}
        defaultProvider="groq"
      />
    </div>
  );
}

