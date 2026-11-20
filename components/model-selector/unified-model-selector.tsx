"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Check,
  Zap,
  Eye,
  Wrench,
  FileCode,
  Sparkles,
  RefreshCw,
  Filter,
  ChevronDown,
  Info,
} from "lucide-react";
import { ModelDefinition, ProviderId, ModelCapability } from "@/types";
import { MODEL_REGISTRY, PROVIDERS_META } from "@/lib/model-registry/models";
import { isProviderConfigured } from "@/lib/security/key-storage";

interface UnifiedModelSelectorProps {
  selectedModelId: string;
  onSelectModel: (model: ModelDefinition) => void;
  onOpenKeyModal?: (provider: ProviderId) => void;
}

export function UnifiedModelSelector({
  selectedModelId,
  onSelectModel,
  onOpenKeyModal,
}: UnifiedModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectionMode, setSelectionMode] = useState<"unified" | "provider">("unified");
  const [activeProviderFilter, setActiveProviderFilter] = useState<string>("all");
  const [capabilityFilter, setCapabilityFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const selectedModel = useMemo(() => {
    return MODEL_REGISTRY.find((m) => m.id === selectedModelId) || MODEL_REGISTRY[0];
  }, [selectedModelId]);

  const filteredModels = useMemo(() => {
    return MODEL_REGISTRY.filter((m) => {
      // Provider filter
      if (activeProviderFilter !== "all" && m.provider !== activeProviderFilter) {
        return false;
      }

      // Capability filter
      if (capabilityFilter !== "all") {
        if (!m.capabilities.includes(capabilityFilter as ModelCapability)) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          m.provider.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [activeProviderFilter, capabilityFilter, searchQuery]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // In real usage, checks provider API if key configured
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  return (
    <div className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 rounded-xl bg-card border border-border hover:border-fruit-500/50 hover:bg-muted/40 transition-all text-left shadow-sm group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-fruit-500/10 border border-fruit-500/20 flex items-center justify-center text-fruit-600 dark:text-fruit-400 shrink-0 font-bold text-xs uppercase">
            {selectedModel.provider.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground truncate">
                {selectedModel.name}
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                {PROVIDERS_META[selectedModel.provider]?.name || selectedModel.provider}
              </span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
              <span>{(selectedModel.contextWindow / 1000).toFixed(0)}k context</span>
              <span>•</span>
              <span className="text-fruit-600 dark:text-fruit-400 font-medium">
                {selectedModel.speedRating}
              </span>
            </div>
          </div>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-fruit-500" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full mt-2 w-full min-w-[340px] sm:min-w-[460px] bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[520px] animate-in fade-in zoom-in-95">
            {/* Header & Mode Switcher */}
            <div className="p-3 border-b border-border bg-muted/30 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 p-0.5 bg-background rounded-lg border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setSelectionMode("unified")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    selectionMode === "unified"
                      ? "bg-fruit-500 text-slate-950 font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Unified Search
                </button>
                <button
                  type="button"
                  onClick={() => setSelectionMode("provider")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    selectionMode === "provider"
                      ? "bg-fruit-500 text-slate-950 font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  By Provider
                </button>
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                title="Refresh model list from providers"
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-fruit-500" : ""}`} />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search models by name, provider, capability..."
                  className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-xl text-xs outline-none focus:border-fruit-500 focus:ring-1 focus:ring-fruit-500"
                />
              </div>

              {/* Provider Filter Tabs */}
              {selectionMode === "provider" && (
                <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setActiveProviderFilter("all")}
                    className={`px-2.5 py-1 rounded-lg text-xs shrink-0 transition-colors ${
                      activeProviderFilter === "all"
                        ? "bg-fruit-500/15 text-fruit-700 dark:text-fruit-300 font-semibold border border-fruit-500/30"
                        : "bg-muted/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All Providers
                  </button>
                  {(Object.keys(PROVIDERS_META) as ProviderId[]).map((pid) => (
                    <button
                      key={pid}
                      type="button"
                      onClick={() => setActiveProviderFilter(pid)}
                      className={`px-2.5 py-1 rounded-lg text-xs shrink-0 transition-colors ${
                        activeProviderFilter === pid
                          ? "bg-fruit-500/15 text-fruit-700 dark:text-fruit-300 font-semibold border border-fruit-500/30"
                          : "bg-muted/50 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {PROVIDERS_META[pid].name}
                    </button>
                  ))}
                </div>
              )}

              {/* Capability Filter Pills */}
              <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-0.5">
                {[
                  { id: "all", label: "All" },
                  { id: "vision", label: "Vision", icon: Eye },
                  { id: "tools", label: "Tool Calling", icon: Wrench },
                  { id: "json_mode", label: "JSON Output", icon: FileCode },
                ].map((cap) => {
                  const Icon = cap.icon;
                  return (
                    <button
                      key={cap.id}
                      type="button"
                      onClick={() => setCapabilityFilter(cap.id)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                        capabilityFilter === cap.id
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {Icon && <Icon className="w-3 h-3" />}
                      {cap.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Model List */}
            <div className="overflow-y-auto p-2 space-y-1.5 flex-1">
              {filteredModels.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No matching models found. Try clearing your search query or filters.
                </div>
              ) : (
                filteredModels.map((model) => {
                  const isSelected = model.id === selectedModel.id;
                  const hasKey = isProviderConfigured(model.provider);

                  return (
                    <div
                      key={model.id}
                      onClick={() => {
                        onSelectModel(model);
                        setIsOpen(false);
                      }}
                      className={`p-3 rounded-xl cursor-pointer border transition-all flex items-start justify-between gap-3 ${
                        isSelected
                          ? "border-fruit-500 bg-fruit-500/10 shadow-sm"
                          : "border-transparent hover:border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-xs text-foreground">
                            {model.name}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                            {PROVIDERS_META[model.provider]?.name}
                          </span>
                          {model.isPopular && (
                            <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-fruit-500/20 text-fruit-700 dark:text-fruit-300 flex items-center gap-0.5">
                              <Sparkles className="w-2.5 h-2.5" /> Popular
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                          {model.description}
                        </p>

                        {/* Badges / Specs */}
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground flex-wrap">
                          <span className="font-mono">{model.id}</span>
                          <span>•</span>
                          <span>{(model.contextWindow / 1000).toFixed(0)}k ctx</span>
                          <span>•</span>
                          <span>
                            ${model.pricing.inputPer1M} / ${model.pricing.outputPer1M} per 1M tok
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-1">
                        {isSelected && <Check className="w-4 h-4 text-fruit-500" />}
                        {!hasKey && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenKeyModal) onOpenKeyModal(model.provider);
                            }}
                            className="text-[10px] text-amber-600 dark:text-amber-400 underline hover:no-underline font-medium"
                          >
                            Set Key
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-2.5 border-t border-border bg-muted/20 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>{filteredModels.length} models available</span>
              <span className="text-fruit-600 dark:text-fruit-400 font-medium">BYOK Enabled</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

