# 🍋 AnkIt Playground

> **The Next-Generation AI Experimentation & Prompt Engineering Platform**  
> Inspired by Groq Playground, engineered with an original developer-first identity, deep prompt diagnostics, and a strict **Bring Your Own Key (BYOK)** architecture.

[![Next.js 15](https://img.shields.io/badge/Next.js-15.0.3-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![BYOK Architecture](https://img.shields.io/badge/Architecture-100%25_BYOK-amber)](https://github.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🌟 Overview & Product Vision

**AnkIt** is a production-ready, web-based AI experimentation platform designed for developers, students, researchers, and AI enthusiasts. It allows you to test system prompts, experiment with model parameters, run multi-turn chats, compare models side-by-side, analyze zero/one/few-shot prompts offline, and track token costs in real time.

### 🛡️ The Core BYOK Guarantee (Bring Your Own Key)
- **Zero Server Credentials**: AnkIt **never** requires, stores, or persists personal API keys on the server or in Vercel environment variables.
- **Visitor Isolation**: Every visitor provides their own API keys stored strictly in their local browser (`sessionStorage` for temporary sessions or `localStorage` for persistent device storage).
- **Publicly Deployable & Sharable**: You can deploy AnkIt once on Vercel and share the public URL with anyone. Each user runs requests using their own credentials without risking your quota or seeing your data.

---

## 🚀 Key Features

### 1. 🎛️ 3-Panel Playground
- **Left Panel (Model & Hyperparameters)**:
  - Unified searchable model selector + Provider-wise selector.
  - Capability filters: Vision, Tool Calling, JSON Mode, Streaming.
  - Temperature, Max Tokens, Top P, Top K, Stop Sequences, Seed, Response Format (Text, JSON Object, JSON Schema).
- **Center Panel (Interactive Chat & Stream)**:
  - Multi-turn conversation with edit, delete, clear, and regenerate actions.
  - Fast Server-Sent Events (SSE) streaming.
  - Vision support: Upload and preview images for multimodal models (GPT-4o, Claude 3.5 Sonnet, Gemini 1.5, Llama 3.2 Vision).
  - Stop generation via `AbortController`.
- **Right Panel (Live Telemetry & Cost Tracking)**:
  - Real-time token tracking (input tokens, output tokens, tokens/sec).
  - Accurate query cost calculations using a maintained model pricing catalog.
  - Inline prompt technique indicator.

### 2. 🔬 AnkIt Signature Feature: Prompt Analysis Engine
- **Accurate Offline Classifier**:
  - **Zero-Shot**: Accurately recognizes instruction-only prompts without input-output demonstrations.
  - **One-Shot**: Detects exactly one concrete input-output demonstration pair.
  - **Few-Shot**: Detects and extracts multiple structured demonstration pairs.
  - **Demonstration vs. Example Disambiguation**: Casual words like *"for example, you could..."* or illustrative analogies are **never** falsely classified as demonstrations.
- **Quality Scorecard**:
  - Scores Clarity, Specificity, Context, Role Framing, Task Instructions, Constraints, and Output Format.
  - Identifies ambiguous words (e.g., *"good"*, *"simple"*, *"etc."*) and suggests replacements.
- **Side-by-Side Prompt Optimization**:
  - Automatically produces an improved prompt revision with explicit headers and negative constraints.
  - Optional **"Improve with BYOK AI"** deep rewriting using your connected model.

### 3. ⚔️ Model Comparison Arena
- Benchmark up to 4 models simultaneously (e.g. Groq Llama 3.3 70B vs. GPT-4o vs. Claude 3.5 Sonnet vs. Gemini 1.5 Flash).
- Compare latency (ms), tokens per second, total token consumption, and cost per query side-by-side.

### 4. 📚 Versioned Prompt Library
- Save and organize high-performing prompt templates with categories and tags.
- Full revision history: Save named versions, compare changes, and restore older versions.
- Includes pre-built templates for zero-shot architecture, one-shot classification, and few-shot SQL generation.

### 5. 📜 Experiment History
- 100% browser-local persistence of past queries, system instructions, model parameters, responses, and token stats.
- Search, filter by provider/model, restore directly to the playground, or export as JSON.

---

## ⚡ Supported Providers & Models

| Provider | Supported Models | Speed Rating | Multimodal / Vision | Tool Calling |
| :--- | :--- | :--- | :---: | :---: |
| **Groq** | `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `llama-3.2-11b-vision-preview`, `deepseek-r1-distill-llama-70b`, `mixtral-8x7b-32768` | 200–800 t/s | ✅ | ✅ |
| **OpenAI** | `gpt-4o`, `gpt-4o-mini`, `o1`, `o1-mini` | 60–140 t/s | ✅ | ✅ |
| **Google Gemini** | `gemini-1.5-pro`, `gemini-1.5-flash`, `gemini-2.0-flash-exp` | 75–220 t/s | ✅ | ✅ |
| **Anthropic Claude** | `claude-3-5-sonnet-20241022`, `claude-3-5-haiku-20241022`, `claude-3-opus-20240229` | 45–160 t/s | ✅ | ✅ |
| **OpenRouter** | Any OpenRouter model ID (`anthropic/claude-3.5-sonnet`, `mistralai/mistral-large-2407`, etc.) | 80–120 t/s | ✅ | ✅ |

---

## 🔒 Security Architecture (BYOK)

1. **Storage Isolation**:
   - Temporary keys are kept only in `sessionStorage` and vanish when the tab closes.
   - Saved keys are kept in device `localStorage`.
   - Keys are **never** sent to any analytics, logging, or third-party database.
2. **Proxy Confidentiality**:
   - For providers requiring a backend proxy (due to browser CORS policies like Groq and Anthropic), keys are sent in memory solely for the duration of the HTTP streaming request.
   - Sensitive headers (`Authorization`, `x-api-key`) and error strings are strictly scrubbed to prevent accidental logging or exposure.
   - No fallback shared server key exists. If a user provides an invalid key, only an error message is returned.

---

## 🛠️ Local Development & Quick Start

### Prerequisites
- Node.js `v18.17+` or `v20+` (tested on Node v26)
- npm, pnpm, or yarn

### 1. Clone & Install
```bash
git clone https://github.com/your-username/fruitai-playground.git
cd fruitai-playground
npm install
```

### 2. Configure Environment (Optional)
```bash
cp .env.example .env.local
```
*(No API keys needed in `.env`! Users input their own keys in the UI).*

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Run Automated Tests
```bash
npm test
```

---

## 🚢 Deploying to Vercel

AnkIt is pre-configured for seamless zero-config deployment on Vercel:

1. Push this repository to your GitHub account:
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit of FruitAI playground"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
2. Go to [Vercel](https://vercel.com/new).
3. Import your GitHub repository.
4. Leave all environment variables empty (no personal keys needed).
5. Click **Deploy**.

Once deployed, you can share the link with colleagues, friends, or the community. Anyone who visits the link can open the BYOK modal, enter their own Groq, OpenAI, Gemini, Claude, or OpenRouter key, and immediately start experimenting.

---

## 🧪 Testing Checklist Verified

- [x] Application compiles with zero TypeScript errors.
- [x] Next.js 15 production build generates all static & dynamic routes.
- [x] BYOK session & local storage options function properly.
- [x] Keys are deleted cleanly on user request.
- [x] Offline prompt classifier accurately detects zero-shot, one-shot, and few-shot patterns.
- [x] Casual examples are not conflated with demonstrations.
- [x] Model pricing catalog correctly calculates costs for all major LLMs.
- [x] Error messages sanitize and redact API credentials.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

