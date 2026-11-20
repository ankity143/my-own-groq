import { NextRequest, NextResponse } from "next/server";
import { ProviderId, ModelParameters, Message } from "@/types";

interface ChatRequestBody {
  provider: ProviderId;
  model: string;
  messages: Message[];
  systemPrompt?: string;
  parameters: ModelParameters;
  apiKey: string;
}

export const runtime = "nodejs";
export const maxDuration = 60; // 60s max execution

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequestBody = await req.json();
    const { provider, model, messages, systemPrompt, parameters, apiKey } = body;

    // Strict validation
    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length < 5) {
      return NextResponse.json(
        { error: "Missing or invalid API key. Please configure your API key in BYOK settings." },
        { status: 400 }
      );
    }

    if (!provider || !model) {
      return NextResponse.json(
        { error: "Provider and model must be specified." },
        { status: 400 }
      );
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array cannot be empty." },
        { status: 400 }
      );
    }

    // Call provider streaming handler
    switch (provider) {
      case "groq":
      case "openai":
      case "openrouter":
        return handleOpenAICompatibleStream(provider, model, messages, systemPrompt, parameters, apiKey.trim());
      case "anthropic":
        return handleAnthropicStream(model, messages, systemPrompt, parameters, apiKey.trim());
      case "gemini":
        return handleGeminiStream(model, messages, systemPrompt, parameters, apiKey.trim());
      default:
        return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
    }
  } catch (error: any) {
    const safeMessage = sanitizeErrorMessage(error?.message || "Internal server error occurred");
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}

// --- OPENAI-COMPATIBLE (GROQ, OPENAI, OPENROUTER) ---
async function handleOpenAICompatibleStream(
  provider: "groq" | "openai" | "openrouter",
  model: string,
  messages: Message[],
  systemPrompt: string | undefined,
  parameters: ModelParameters,
  apiKey: string
) {
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
    headers["X-Title"] = "FruitAI Playground";
  }

  // Format messages
  const formattedMessages: Array<{ role: string; content: any }> = [];
  if (systemPrompt && systemPrompt.trim()) {
    formattedMessages.push({ role: "system", content: systemPrompt.trim() });
  }

  for (const m of messages) {
    if (m.images && m.images.length > 0) {
      // Multimodal vision format
      const contentParts: any[] = [{ type: "text", text: m.content || "Analyze this image" }];
      for (const img of m.images) {
        contentParts.push({
          type: "image_url",
          image_url: { url: img },
        });
      }
      formattedMessages.push({ role: m.role, content: contentParts });
    } else {
      formattedMessages.push({ role: m.role, content: m.content });
    }
  }

  const payload: any = {
    model,
    messages: formattedMessages,
    temperature: parameters.temperature ?? 0.7,
    max_tokens: parameters.maxTokens || 2048,
    top_p: parameters.topP ?? 1.0,
    stream: true,
  };

  if (parameters.stopSequences && parameters.stopSequences.length > 0) {
    payload.stop = parameters.stopSequences;
  }

  if (parameters.seed !== undefined) {
    payload.seed = parameters.seed;
  }

  // Capability-aware JSON formatting
  if (parameters.responseFormat === "json_object") {
    payload.response_format = { type: "json_object" };
  } else if (parameters.responseFormat === "json_schema" && parameters.jsonSchema) {
    try {
      payload.response_format = {
        type: "json_schema",
        json_schema: {
          name: "output_schema",
          strict: true,
          schema: JSON.parse(parameters.jsonSchema),
        },
      };
    } catch {
      // Invalid schema string fallback
    }
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const sanitized = sanitizeErrorMessage(errorText);
    return NextResponse.json({ error: sanitized }, { status: response.status });
  }

  return createSSEStreamResponse(response.body!);
}

// --- ANTHROPIC CLAUDE STREAM ---
async function handleAnthropicStream(
  model: string,
  messages: Message[],
  systemPrompt: string | undefined,
  parameters: ModelParameters,
  apiKey: string
) {
  const endpoint = "https://api.anthropic.com/v1/messages";

  const anthropicMessages = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => {
      if (m.images && m.images.length > 0) {
        const contentParts: any[] = [];
        for (const img of m.images) {
          const match = img.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
          if (match) {
            contentParts.push({
              type: "image",
              source: {
                type: "base64",
                media_type: `image/${match[1]}`,
                data: match[2],
              },
            });
          }
        }
        contentParts.push({ type: "text", text: m.content || "" });
        return { role: m.role, content: contentParts };
      }
      return { role: m.role, content: m.content };
    });

  const payload: any = {
    model,
    messages: anthropicMessages,
    max_tokens: parameters.maxTokens || 2048,
    temperature: Math.min(1.0, parameters.temperature ?? 0.7), // Anthropic max temp is 1.0
    stream: true,
  };

  if (systemPrompt && systemPrompt.trim()) {
    payload.system = systemPrompt.trim();
  }

  if (parameters.stopSequences && parameters.stopSequences.length > 0) {
    payload.stop_sequences = parameters.stopSequences;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const sanitized = sanitizeErrorMessage(errorText);
    return NextResponse.json({ error: sanitized }, { status: response.status });
  }

  // Transform Anthropic SSE to unified token stream
  const transformStream = new TransformStream({
    transform(chunk, controller) {
      const text = new TextDecoder().decode(chunk);
      const lines = text.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
            continue;
          }
          try {
            const data = JSON.parse(jsonStr);
            if (data.type === "content_block_delta" && data.delta?.text) {
              const standardPayload = JSON.stringify({
                choices: [{ delta: { content: data.delta.text } }],
              });
              controller.enqueue(new TextEncoder().encode(`data: ${standardPayload}\n\n`));
            } else if (data.type === "message_stop") {
              controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
            }
          } catch {
            // Keep going
          }
        }
      }
    },
  });

  return new Response(response.body!.pipeThrough(transformStream), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

// --- GOOGLE GEMINI STREAM ---
async function handleGeminiStream(
  model: string,
  messages: Message[],
  systemPrompt: string | undefined,
  parameters: ModelParameters,
  apiKey: string
) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(
    apiKey
  )}`;

  const contents = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => {
      const parts: any[] = [];
      if (m.images && m.images.length > 0) {
        for (const img of m.images) {
          const match = img.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
          if (match) {
            parts.push({
              inlineData: {
                mimeType: `image/${match[1]}`,
                data: match[2],
              },
            });
          }
        }
      }
      parts.push({ text: m.content || "" });
      return {
        role: m.role === "assistant" ? "model" : "user",
        parts,
      };
    });

  const payload: any = {
    contents,
    generationConfig: {
      temperature: parameters.temperature ?? 0.7,
      maxOutputTokens: parameters.maxTokens || 2048,
      topP: parameters.topP ?? 0.95,
      stopSequences: parameters.stopSequences || [],
    },
  };

  if (systemPrompt && systemPrompt.trim()) {
    payload.systemInstruction = {
      parts: [{ text: systemPrompt.trim() }],
    };
  }

  if (parameters.responseFormat === "json_object" || parameters.responseFormat === "json_schema") {
    payload.generationConfig.responseMimeType = "application/json";
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const sanitized = sanitizeErrorMessage(errorText);
    return NextResponse.json({ error: sanitized }, { status: response.status });
  }

  // Transform Gemini SSE to unified token stream
  const transformStream = new TransformStream({
    transform(chunk, controller) {
      const text = new TextDecoder().decode(chunk);
      const lines = text.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6).trim();
          try {
            const data = JSON.parse(jsonStr);
            const candidate = data.candidates?.[0];
            const partText = candidate?.content?.parts?.[0]?.text;
            if (partText) {
              const standardPayload = JSON.stringify({
                choices: [{ delta: { content: partText } }],
              });
              controller.enqueue(new TextEncoder().encode(`data: ${standardPayload}\n\n`));
            }
            if (candidate?.finishReason) {
              controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
            }
          } catch {
            // Keep going
          }
        }
      }
    },
  });

  return new Response(response.body!.pipeThrough(transformStream), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

function createSSEStreamResponse(stream: ReadableStream) {
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

function sanitizeErrorMessage(msg: string): string {
  // Redact potential keys or sensitive tokens from error strings
  return msg
    .replace(/(?:gsk_|sk-proj-|sk-ant-|sk-or-v1-|AIzaSy)[A-Za-z0-9_-]{10,}/g, "[REDACTED_API_KEY]")
    .replace(/Bearer\s+[A-Za-z0-9_.-]+/gi, "Bearer [REDACTED]");
}
