import { NextRequest, NextResponse } from "next/server";
import { ProviderId } from "@/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const {
      prompt,
      systemPrompt,
      provider,
      model,
      apiKey,
    }: {
      prompt: string;
      systemPrompt?: string;
      provider: ProviderId;
      model: string;
      apiKey: string;
    } = await req.json();

    if (!apiKey || !provider || !model) {
      return NextResponse.json(
        { error: "Provider, model, and API key are required for AI-powered rewriting." },
        { status: 400 }
      );
    }

    const systemInstruction = `You are an elite Prompt Engineer and AI Optimization Specialist.
Your job is to rewrite and optimize the user's prompt to maximize output accuracy, clarity, and model compliance.
Follow these rules:
1. Clarify the core task and eliminate ambiguous or vague phrasing.
2. Structure the prompt cleanly with markdown headers: ### Role, ### Objective, ### Context, ### Instructions, ### Constraints, ### Format.
3. If the prompt intended a few-shot or one-shot structure, retain and clearly format input-output examples.
4. Output your answer in valid JSON format with exactly two fields:
{
  "improvedPrompt": "the full rewritten prompt text",
  "rationale": "a 2-3 sentence explanation of the specific improvements made"
}`;

    const userMessage = `Original Prompt to Improve:
"""
${prompt}
"""
${systemPrompt ? `\nOriginal System Instructions:\n"""\n${systemPrompt}\n"""` : ""}`;

    // Delegate to chat completions route logic
    let endpoint = "https://api.openai.com/v1/chat/completions";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };

    if (provider === "groq") {
      endpoint = "https://api.groq.com/openai/v1/chat/completions";
    } else if (provider === "openrouter") {
      endpoint = "https://openrouter.ai/api/v1/chat/completions";
      headers["HTTP-Referer"] = "https://fruitai.app";
    } else if (provider === "gemini") {
      endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
        apiKey
      )}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: userMessage }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: { responseMimeType: "application/json" },
        }),
      });
      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = JSON.parse(rawText || "{}");
      return NextResponse.json(parsed);
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: userMessage },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content || "{}");

    return NextResponse.json({
      improvedPrompt: parsed.improvedPrompt || prompt,
      rationale: parsed.rationale || "Prompt restructured for enhanced clarity and compliance.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to improve prompt with AI" },
      { status: 500 }
    );
  }
}
