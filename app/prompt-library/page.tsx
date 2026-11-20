"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Search,
  Star,
  Copy,
  Trash2,
  Edit,
  History,
  Check,
  ArrowRight,
  Tag,
  Folder,
  Layers,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { PromptTemplate, PromptVersion } from "@/types";
import {
  loadPromptTemplates,
  savePromptTemplate,
  deletePromptTemplate,
  STARTER_PROMPTS,
} from "@/lib/storage";
import { useToast } from "@/components/ui/toast";
import { generateId } from "@/lib/utils";

export default function PromptLibraryPage() {
  const toast = useToast();
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  // Editor Modal State
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [editorTitle, setEditorTitle] = useState("");
  const [editorCategory, setEditorCategory] = useState("General");
  const [editorTags, setEditorTags] = useState("");
  const [editorSystemPrompt, setEditorSystemPrompt] = useState("");
  const [editorUserPrompt, setEditorUserPrompt] = useState("");
  const [newVersionName, setNewVersionName] = useState("");
  const [newVersionDescription, setNewVersionDescription] = useState("");
  const [viewingVersion, setViewingVersion] = useState<PromptVersion | null>(null);

  useEffect(() => {
    setTemplates(loadPromptTemplates());
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>(["All"]);
    templates.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set);
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      if (favoritesOnly && !t.isFavorite) return false;
      if (selectedCategory !== "All" && t.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.userPrompt.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [templates, favoritesOnly, selectedCategory, searchQuery]);

  const handleToggleFavorite = (tpl: PromptTemplate) => {
    const updated = { ...tpl, isFavorite: !tpl.isFavorite, updatedAt: Date.now() };
    savePromptTemplate(updated);
    setTemplates(loadPromptTemplates());
  };

  const handleDuplicate = (tpl: PromptTemplate) => {
    const duplicated: PromptTemplate = {
      ...tpl,
      id: generateId(),
      title: `${tpl.title} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      versions: [...tpl.versions],
    };
    savePromptTemplate(duplicated);
    setTemplates(loadPromptTemplates());
    toast.success("Prompt Duplicated", `Created copy of ${tpl.title}`);
  };

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      deletePromptTemplate(id);
      setTemplates(loadPromptTemplates());
      toast.info("Prompt Deleted", title);
    }
  };

  const handleOpenEditor = (tpl?: PromptTemplate) => {
    if (tpl) {
      setEditingTemplate(tpl);
      setEditorTitle(tpl.title);
      setEditorCategory(tpl.category);
      setEditorTags(tpl.tags.join(", "));
      setEditorSystemPrompt(tpl.systemPrompt);
      setEditorUserPrompt(tpl.userPrompt);
      setNewVersionName("");
      setNewVersionDescription("");
      setViewingVersion(null);
    } else {
      // New template
      const newTpl: PromptTemplate = {
        id: generateId(),
        title: "New Custom Prompt",
        description: "Created in Prompt Library",
        category: "General",
        tags: ["custom"],
        systemPrompt: "You are an AI assistant.",
        userPrompt: "",
        isFavorite: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        currentVersion: 1,
        versions: [],
      };
      setEditingTemplate(newTpl);
      setEditorTitle(newTpl.title);
      setEditorCategory(newTpl.category);
      setEditorTags("custom");
      setEditorSystemPrompt(newTpl.systemPrompt);
      setEditorUserPrompt("");
      setNewVersionName("v1.0 Initial Draft");
      setNewVersionDescription("Initial version");
      setViewingVersion(null);
    }
  };

  const handleSaveEditor = (createNewVersion = false) => {
    if (!editingTemplate || !editorTitle.trim()) return;

    let versions = [...editingTemplate.versions];
    let nextVersionNumber = editingTemplate.currentVersion || 1;

    if (createNewVersion || versions.length === 0) {
      nextVersionNumber = versions.length + 1;
      versions.unshift({
        version: nextVersionNumber,
        name: newVersionName.trim() || `v${nextVersionNumber}.0 Revision`,
        description: newVersionDescription.trim() || "Updated prompt contents",
        systemPrompt: editorSystemPrompt,
        userPrompt: editorUserPrompt,
        timestamp: Date.now(),
      });
    }

    const updated: PromptTemplate = {
      ...editingTemplate,
      title: editorTitle.trim(),
      category: editorCategory.trim() || "General",
      tags: editorTags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      systemPrompt: editorSystemPrompt,
      userPrompt: editorUserPrompt,
      currentVersion: nextVersionNumber,
      versions,
      updatedAt: Date.now(),
    };

    savePromptTemplate(updated);
    setTemplates(loadPromptTemplates());
    setEditingTemplate(null);
    toast.success("Saved Prompt", updated.title);
  };

  const handleRestoreVersion = (v: PromptVersion) => {
    setEditorSystemPrompt(v.systemPrompt);
    setEditorUserPrompt(v.userPrompt);
    setViewingVersion(null);
    toast.info("Version Restored", `Loaded contents from version ${v.version} (${v.name})`);
  };

  return (
    <div className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-fruit-500/15 border border-fruit-500/30 text-fruit-700 dark:text-fruit-300 text-xs font-semibold mb-2">
            <BookOpen className="w-3.5 h-3.5 text-fruit-500" />
            Prompt Engineering Vault & Version History
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Prompt Library
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
            Save, version, categorize, and deploy high-performing prompt templates directly into the playground.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenEditor()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-fruit-500 hover:bg-fruit-600 text-slate-950 font-bold text-xs shadow-md shadow-fruit-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" /> Create Prompt Template
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prompts by title, tags, or content..."
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-input rounded-xl text-xs outline-none focus:border-fruit-500 focus:ring-1 focus:ring-fruit-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
              favoritesOnly
                ? "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${favoritesOnly ? "fill-current" : ""}`} /> Favorites
          </button>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-card border border-input rounded-xl text-xs font-medium outline-none focus:border-fruit-500"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                Category: {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Prompts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTemplates.map((tpl) => (
          <div
            key={tpl.id}
            className="p-5 rounded-2xl bg-card border border-border hover:border-fruit-500/40 shadow-sm transition-all flex flex-col justify-between group space-y-4"
          >
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase font-semibold">
                  {tpl.category}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggleFavorite(tpl)}
                    className="p-1 rounded-lg text-muted-foreground hover:text-amber-500 transition-colors"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        tpl.isFavorite ? "fill-amber-400 text-amber-500" : ""
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicate(tpl)}
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                    title="Duplicate prompt"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(tpl.id, tpl.title)}
                    className="p-1 rounded-lg text-muted-foreground hover:text-rose-500 transition-colors"
                    title="Delete prompt"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Title & Desc */}
              <div>
                <h3 className="text-base font-bold text-foreground group-hover:text-fruit-500 transition-colors">
                  {tpl.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                  {tpl.description}
                </p>
              </div>

              {/* Preview Snippet */}
              <div className="p-3 rounded-xl bg-background border border-border text-xs font-mono text-muted-foreground line-clamp-3 leading-relaxed">
                {tpl.userPrompt || tpl.systemPrompt}
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tpl.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-fruit-500/10 text-fruit-700 dark:text-fruit-300 border border-fruit-500/20"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => handleOpenEditor(tpl)}
                className="text-muted-foreground hover:text-foreground font-semibold flex items-center gap-1.5"
              >
                <Edit className="w-3.5 h-3.5" /> Edit ({tpl.versions.length || 1} vers.)
              </button>

              <Link
                href={`/playground?template=${tpl.id}`}
                className="font-bold text-fruit-600 dark:text-fruit-400 hover:underline flex items-center gap-1"
              >
                Use in Playground <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Versioned Prompt Editor Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div
            className="bg-card border border-border w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-fruit-500" />
                <h2 className="text-base font-bold text-foreground">
                  Versioned Prompt Editor: {editorTitle || "Untitled"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingTemplate(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Meta Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editorTitle}
                    onChange={(e) => setEditorTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs font-semibold outline-none focus:border-fruit-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={editorCategory}
                    onChange={(e) => setEditorCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs outline-none focus:border-fruit-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={editorTags}
                  onChange={(e) => setEditorTags(e.target.value)}
                  placeholder="e.g. zero-shot, sql, classification"
                  className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs outline-none focus:border-fruit-500"
                />
              </div>

              {/* System Instructions */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  System Instructions
                </label>
                <textarea
                  rows={3}
                  value={editorSystemPrompt}
                  onChange={(e) => setEditorSystemPrompt(e.target.value)}
                  className="w-full p-3 bg-background border border-input rounded-xl text-xs font-mono outline-none focus:border-fruit-500"
                />
              </div>

              {/* User Prompt */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  User Prompt Body
                </label>
                <textarea
                  rows={7}
                  value={editorUserPrompt}
                  onChange={(e) => setEditorUserPrompt(e.target.value)}
                  className="w-full p-3 bg-background border border-input rounded-xl text-xs font-mono outline-none focus:border-fruit-500"
                />
              </div>

              {/* Version History Section */}
              <div className="pt-4 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <History className="w-4 h-4 text-fruit-500" />
                    Version History ({editingTemplate.versions.length} Revisions)
                  </h3>
                </div>

                {editingTemplate.versions.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {editingTemplate.versions.map((ver) => (
                      <div
                        key={ver.version}
                        className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-bold text-foreground flex items-center gap-2">
                            <span>v{ver.version}</span>
                            <span>•</span>
                            <span>{ver.name}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {ver.description} — {new Date(ver.timestamp).toLocaleString()}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRestoreVersion(ver)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-fruit-500/15 text-fruit-700 dark:text-fruit-300 hover:bg-fruit-500/25 transition-colors"
                          >
                            Restore This Version
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Save New Version Card */}
                <div className="p-4 rounded-xl bg-fruit-500/5 border border-fruit-500/20 space-y-2">
                  <span className="text-xs font-bold text-fruit-700 dark:text-fruit-300 block">
                    Save as a New Revision
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Version Name (e.g. v2.1 Refined examples)"
                      value={newVersionName}
                      onChange={(e) => setNewVersionName(e.target.value)}
                      className="px-3 py-1.5 bg-background border border-input rounded-lg text-xs outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Change Summary"
                      value={newVersionDescription}
                      onChange={(e) => setNewVersionDescription(e.target.value)}
                      className="px-3 py-1.5 bg-background border border-input rounded-lg text-xs outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setEditingTemplate(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-border hover:bg-muted"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveEditor(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-border hover:bg-muted"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveEditor(true)}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-fruit-500 hover:bg-fruit-600 text-slate-950 shadow-md"
                >
                  Save as New Version
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
