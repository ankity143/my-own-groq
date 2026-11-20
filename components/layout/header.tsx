"use client";

import React, { useState, useEffect } from "react";
import {
  Key,
  Moon,
  Sun,
  Menu,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { ProviderId } from "@/types";
import { isProviderConfigured } from "@/lib/security/key-storage";

interface HeaderProps {
  onOpenKeyModal: (provider?: ProviderId) => void;
  onToggleMobileMenu?: () => void;
  activeProvider?: ProviderId;
  activeModelName?: string;
  keysUpdatedTrigger?: number;
}

export function Header({
  onOpenKeyModal,
  onToggleMobileMenu,
  activeProvider = "groq",
  activeModelName = "Llama 3.3 70B",
  keysUpdatedTrigger,
}: HeaderProps) {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [hasActiveKey, setHasActiveKey] = useState(false);

  useEffect(() => {
    // Check dark mode
    const isDark = document.documentElement.classList.contains("dark");
    setIsDarkMode(isDark);
  }, []);

  useEffect(() => {
    setHasActiveKey(isProviderConfigured(activeProvider));
  }, [activeProvider, keysUpdatedTrigger]);

  const toggleTheme = () => {
    if (document.documentElement.classList.contains("dark")) {
      document.documentElement.classList.remove("dark");
      setIsDarkMode(false);
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
      localStorage.setItem("theme", "dark");
    }
  };

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="p-2 rounded-xl border border-border md:hidden text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="hidden sm:flex items-center gap-2 text-xs">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-fruit-500 animate-pulse" />
            FruitAI
          </span>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground font-mono">{activeModelName}</span>
        </div>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-2.5">
        {/* BYOK Status Button */}
        <button
          type="button"
          onClick={() => onOpenKeyModal(activeProvider)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            hasActiveKey
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
              : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
          }`}
        >
          {hasActiveKey ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Key Active ({activeProvider})</span>
              <span className="sm:hidden font-mono uppercase">{activeProvider}</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
              <span>Set {activeProvider.toUpperCase()} Key</span>
            </>
          )}
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-fruit-400" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}

