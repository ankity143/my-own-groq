import { NextRequest, NextResponse } from "next/server";
import { ProviderId } from "@/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { provider, apiKey }: { provider: ProviderId; apiKey: string } = await req.json();

    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length < 5) {
      return NextResponse.json(
        { valid: false, error: "Please provide a valid API key string." },
        { status: 400 }
      );
    }

    const key = apiKey.trim();

    switch (provider) {
      case "groq": {
        const res = await fetch("https://api.groq.com/openai/v1/models", {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return NextResponse.json(
            { valid: false, error: err?.error?.message || "Invalid Groq API key" },
            { status: 401 }
          );
        }
        const data = await res.json();
        const models = (data.data || []).map((m: any) => ({
          id: m.id,
          name: m.id,
          provider: "groq",
          contextWindow: m.context_window || 8192,
        }));
        return NextResponse.json({ valid: true, models });
      }

      case "openai": {
        const res = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return NextResponse.json(
            { valid: false, error: err?.error?.message || "Invalid OpenAI API key" },
            { status: 401 }
          );
        }
        const data = await res.json();
        const models = (data.data || [])
          .filter((m: any) => m.id.startsWith("gpt-") || m.id.startsWith("o1"))
          .map((m: any) => ({
            id: m.id,
            name: m.id,
            provider: "openai",
          }));
        return NextResponse.json({ valid: true, models });
      }

      case "gemini": {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return NextResponse.json(
            { valid: false, error: err?.error?.message || "Invalid Google Gemini API key" },
            { status: 401 }
          );
        }
        const data = await res.json();
        const models = (data.models || [])
          .filter((m: any) => m.name.includes("gemini"))
          .map((m: any) => {
            const shortId = m.name.replace("models/", "");
            return {
              id: shortId,
              name: m.displayName || shortId,
              provider: "gemini",
              contextWindow: m.inputTokenLimit || 1000000,
            };
          });
        return NextResponse.json({ valid: true, models });
      }

      case "anthropic": {
        // Anthropic doesn't have a public GET /models endpoint on all tiers; test key with minimal messages count request
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-3-5-haiku-20241022",
            max_tokens: 1,
            messages: [{ role: "user", content: "ping" }],
          }),
        });

        if (res.status === 401 || res.status === 403) {
          const err = await res.json().catch(() => ({}));
          return NextResponse.json(
            { valid: false, error: err?.error?.message || "Invalid Anthropic API key" },
            { status: 401 }
          );
        }

        return NextResponse.json({ valid: true, models: [] });
      }

      case "openrouter": {
        const res = await fetch("https://openrouter.ai/api/v1/models", {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (!res.ok) {
          return NextResponse.json(
            { valid: false, error: "Invalid OpenRouter API key" },
            { status: 401 }
          );
        }
        const data = await res.json();
        const models = (data.data || []).slice(0, 50).map((m: any) => ({
          id: m.id,
          name: m.name || m.id,
          provider: "openrouter",
          contextWindow: m.context_length || 32000,
        }));
        return NextResponse.json({ valid: true, models });
      }

      default:
        return NextResponse.json({ valid: false, error: "Unknown provider" }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json(
      { valid: false, error: error?.message || "Network validation error" },
      { status: 500 }
    );
  }
}
