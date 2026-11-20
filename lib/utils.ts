import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

export function formatCost(dollars: number): string {
  if (dollars === 0) return "$0.0000";
  if (dollars < 0.0001) return `<$0.0001`;
  return `$${dollars.toFixed(4)}`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function estimateTokensFromText(text: string): number {
  if (!text) return 0;
  // Standard rule of thumb: ~4 characters per token in English
  return Math.max(1, Math.ceil(text.length / 3.8));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36).substring(4);
}
