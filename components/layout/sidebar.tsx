"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Terminal,
  ScanSearch,
  Split,
  BookOpen,
  History,
  Key,
  Settings,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { FruitLogo } from "@/components/ui/fruit-logo";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenKeyModal: () => void;
  configuredCount: number;
}

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/playground", label: "Playground", icon: Terminal, badge: "3-Panel" },
  { href: "/prompt-analysis", label: "Prompt Analysis", icon: ScanSearch, highlight: true },
  { href: "/model-comparison", label: "Model Comparison", icon: Split },
  { href: "/prompt-library", label: "Prompt Library", icon: BookOpen },
  { href: "/history", label: "Experiment History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  isCollapsed,
  onToggleCollapse,
  onOpenKeyModal,
  configuredCount,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-30 flex flex-col bg-card border-r border-border transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-[72px]" : "w-[240px]"
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        {!isCollapsed ? (
          <FruitLogo size="md" />
        ) : (
          <div className="mx-auto">
            <FruitLogo size="sm" showBadge={false} />
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-fruit-500 text-slate-950 font-bold shadow-md shadow-fruit-500/20"
                  : item.highlight
                  ? "text-fruit-600 dark:text-fruit-400 hover:bg-fruit-500/10 hover:text-fruit-700 dark:hover:text-fruit-300"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!isCollapsed && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/10 dark:bg-white/10 uppercase font-semibold">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* BYOK Status Card in Sidebar */}
      <div className="p-3 border-t border-border">
        {!isCollapsed ? (
          <button
            type="button"
            onClick={onOpenKeyModal}
            className="w-full p-3 rounded-xl bg-fruit-500/10 border border-fruit-500/20 hover:border-fruit-500/40 text-left transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-fruit-500" /> BYOK Keys
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">
                {configuredCount} Active
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-1">
              Manage your local device & session keys
            </p>
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenKeyModal}
            title={`BYOK Keys (${configuredCount} active)`}
            className="w-10 h-10 mx-auto rounded-xl bg-fruit-500/10 border border-fruit-500/20 flex items-center justify-center text-fruit-600 dark:text-fruit-400 hover:bg-fruit-500/20 transition-all"
          >
            <Key className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Collapse Toggle Footer */}
      <div className="h-12 border-t border-border flex items-center justify-between px-3">
        {!isCollapsed && (
          <span className="text-[10px] text-muted-foreground font-mono">v1.0.0 • BYOK</span>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors ml-auto"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
