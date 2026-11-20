import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "FruitAI Playground — Next-Gen AI Experimentation & BYOK Platform",
  description:
    "Professional AI developer playground with Bring Your Own Key (BYOK) architecture. Experiment with Groq, OpenAI, Gemini, Claude, and OpenRouter, analyze zero-shot/few-shot prompts, and compare AI models.",
  keywords: [
    "AI playground",
    "BYOK",
    "Groq playground",
    "Prompt analysis",
    "Few-shot prompt",
    "LLM comparison",
    "OpenAI",
    "Anthropic",
    "Gemini",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-fruit-500 selection:text-slate-950">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
