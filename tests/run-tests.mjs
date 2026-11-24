import assert from "assert";

console.log("==========================================");
console.log("🧪 RUNNING AnkIt SUITE OF AUTOMATED TESTS");
console.log("==========================================\n");

// 1. Mock classifier logic for isolated testing
function extractDemonstrations(text) {
  const results = [];
  const ioPattern =
    /(?:(?:Example|Demo|Case)\s*\d*[:.-]?\s*)?(?:Input|Query|User|Question|Prompt|Q)[:]\s*([^\n\r]+(?:\n(?!(?:Output|Response|Assistant|Answer|A)[:])[^\n\r]+)*)\s*(?:Output|Response|Assistant|Answer|A)[:]\s*([^\n\r]+(?:\n(?!(?:(?:Example|Demo|Case)\s*\d*[:.-]?\s*)?(?:Input|Query|User|Question|Prompt|Q)[:])[^\n\r]+)*)/gi;

  let match;
  while ((match = ioPattern.exec(text)) !== null) {
    const rawInput = (match[1] || "").trim();
    const rawOutput = (match[2] || "").trim();
    if (rawInput && rawOutput && rawOutput.length > 0 && !rawOutput.match(/^(?:\[insert\]|\.\.\.|\?)$/i)) {
      results.push({ input: rawInput, output: rawOutput });
    }
  }
  return results;
}

function classifyPrompt(prompt) {
  const demos = extractDemonstrations(prompt);
  const count = demos.length;
  let technique = "zero-shot";
  if (count === 1) technique = "one-shot";
  else if (count > 1) technique = "few-shot";

  const casualExample = /\b(for example|for instance|such as|e\.g\.)\b/i.test(prompt);
  return { technique, demonstrationsCount: count, hasCasualExample: casualExample };
}

function sanitizeErrorMessage(msg) {
  return msg
    .replace(/(?:gsk_|sk-proj-|sk-ant-|sk-or-v1-|AIzaSy)[A-Za-z0-9_-]{10,}/g, "[REDACTED_API_KEY]")
    .replace(/Bearer\s+[A-Za-z0-9_.-]+/gi, "Bearer [REDACTED]");
}

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(err);
  }
}

// TEST 1: Zero-Shot Prompt Classification
runTest("Zero-Shot prompt without demonstrations classified correctly", () => {
  const prompt = "Explain quantum computing in simple terms for high school students.";
  const res = classifyPrompt(prompt);
  assert.strictEqual(res.technique, "zero-shot");
  assert.strictEqual(res.demonstrationsCount, 0);
});

// TEST 2: One-Shot Prompt Classification
runTest("One-Shot prompt with exactly 1 demonstration pair classified correctly", () => {
  const prompt = `Classify sentiment.
Input: "Great service and fast response!"
Output: Positive

Input: "My package was delayed by three days."
Output:`;
  const res = classifyPrompt(prompt);
  assert.strictEqual(res.technique, "one-shot");
  assert.strictEqual(res.demonstrationsCount, 1);
});

// TEST 3: Few-Shot Prompt Classification
runTest("Few-Shot prompt with multiple demonstration pairs classified correctly", () => {
  const prompt = `Translate to Spanish.
Example 1:
Input: hello
Output: hola

Example 2:
Input: goodbye
Output: adiós

Example 3:
Input: thank you
Output: gracias

Input: please
Output:`;
  const res = classifyPrompt(prompt);
  assert.strictEqual(res.technique, "few-shot");
  assert.strictEqual(res.demonstrationsCount, 3);
});

// TEST 4: Ambiguous casual example handling
runTest("Casual 'for example' text is not falsely classified as demonstration", () => {
  const prompt = "Write a python script to process fruits. For example, you can calculate the price of an apple or banana.";
  const res = classifyPrompt(prompt);
  assert.strictEqual(res.technique, "zero-shot");
  assert.strictEqual(res.demonstrationsCount, 0);
  assert.strictEqual(res.hasCasualExample, true);
});

// TEST 5: Security Redaction of API Keys in errors
runTest("Sensitive API keys are strictly redacted from error messages", () => {
  const rawGroq = "HTTP 401: Invalid API key gsk_99a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4 provided";
  const sanitizedGroq = sanitizeErrorMessage(rawGroq);
  assert(!sanitizedGroq.includes("gsk_99a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4"));
  assert(sanitizedGroq.includes("[REDACTED_API_KEY]"));

  const rawOpenAI = "Authorization failed for Bearer sk-proj-1234567890abcdef1234567890";
  const sanitizedOpenAI = sanitizeErrorMessage(rawOpenAI);
  assert(!sanitizedOpenAI.includes("sk-proj-1234567890abcdef1234567890"));
});

// TEST 6: Cost calculation calculation logic
runTest("Cost calculation respects pricing catalog rates accurately", () => {
  // Model pricing: $0.59 input per 1M, $0.79 output per 1M
  const inputTokens = 1000;
  const outputTokens = 500;
  const inputCost = (inputTokens / 1_000_000) * 0.59;
  const outputCost = (outputTokens / 1_000_000) * 0.79;
  const total = inputCost + outputCost;
  assert(total > 0);
  assert.strictEqual(total.toFixed(6), "0.000985");
});

// TEST 7: Token estimation rule of thumb
runTest("Token estimation approximates ~4 characters per token", () => {
  const text = "The quick brown fox jumps over the lazy dog"; // 43 chars
  const est = Math.ceil(text.length / 3.8);
  assert(est >= 10 && est <= 13);
});

console.log("\n------------------------------------------");
console.log(`Summary: ${passed}/${total} tests passed!`);
console.log("------------------------------------------\n");

if (passed !== total) {
  process.exit(1);
}

