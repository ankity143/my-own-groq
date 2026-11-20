import {
  PromptShotTechnique,
  Demonstration,
  DetectedTechnique,
  PromptQualityScore,
  PromptAnalysisResult,
} from "@/types";

interface ParsedDemonstrationMatch {
  input: string;
  output: string;
  rawSnippet: string;
  index: number;
}

/**
 * Detects whether a prompt uses zero-shot, one-shot, or few-shot prompting,
 * rigorously separating true input-output demonstrations from ordinary narrative examples.
 */
export function analyzePrompt(promptText: string, systemPrompt?: string): PromptAnalysisResult {
  const fullText = (promptText || "").trim();
  const sysText = (systemPrompt || "").trim();
  const combined = sysText ? `${sysText}\n\n${fullText}` : fullText;

  if (!combined) {
    return createEmptyAnalysisResult();
  }

  // 1. Detect Demonstrations
  const demonstrations = extractDemonstrations(fullText);
  const count = demonstrations.length;

  // 2. Identify Technique & Confidence
  let technique: PromptShotTechnique = "zero-shot";
  let confidence = 85;
  let explanation = "";
  const evidence: string[] = [];
  const ambiguityWarnings: string[] = [];

  // Check for ambiguous "example" usage without output pairs
  const casualExampleRegex = /\b(for example|for instance|such as|e\.g\.|like)\b/gi;
  const casualMatches = fullText.match(casualExampleRegex);

  if (count === 0) {
    technique = "zero-shot";
    confidence = 94;
    explanation =
      "The prompt provides direct task instructions without explicit input-to-output demonstrations. The model is expected to execute the task purely from instructions and pre-trained knowledge.";
    evidence.push("No paired input-output demonstration patterns were detected.");

    if (casualMatches && casualMatches.length > 0) {
      confidence = 88;
      ambiguityWarnings.push(
        `Prompt contains illustrative phrasing (${casualMatches.slice(0, 2).join(", ")}) illustrating concepts or vocabulary, but does NOT supply an explicit input-output target demonstration. Correctly classified as Zero-Shot.`
      );
    }
  } else if (count === 1) {
    technique = "one-shot";
    confidence = 92;
    explanation =
      "The prompt includes exactly one concrete demonstration showing the model an input and its corresponding desired output before presenting the actual task.";
    evidence.push(`Found 1 demonstration: Input "${truncate(demonstrations[0].input, 40)}" → Output "${truncate(demonstrations[0].output, 40)}"`);
  } else {
    technique = "few-shot";
    confidence = Math.min(98, 90 + count * 2);
    explanation = `The prompt provides ${count} distinct input-output demonstrations, establishing an in-context pattern for the model to follow.`;
    evidence.push(`Detected ${count} structured demonstrations in the prompt body.`);
    demonstrations.forEach((d, i) => {
      evidence.push(`Demo #${i + 1}: Input "${truncate(d.input, 30)}" → Output "${truncate(d.output, 30)}"`);
    });
  }

  // 3. Detect Advanced Prompt Techniques
  const detectedTechniques = detectAdvancedTechniques(combined);

  // 4. Score Prompt Quality
  const qualityScore = calculateQualityScore(combined, detectedTechniques, count);

  // 5. Detect Ambiguities and Missing Information
  const { missingInformation, ambiguousPhrases } = identifyFlaws(combined, qualityScore);

  // 6. Generate Improvement Suggestions
  const suggestions = generateSuggestions(combined, technique, qualityScore, missingInformation);

  // 7. Generate Algorithmic Improved Prompt
  const { improvedPrompt, improvementRationale } = generateImprovedPrompt(
    fullText,
    sysText,
    technique,
    qualityScore,
    suggestions
  );

  return {
    technique,
    confidence,
    demonstrationsCount: count,
    demonstrations,
    explanation,
    evidence,
    ambiguityWarnings,
    detectedTechniques,
    qualityScore,
    missingInformation,
    ambiguousPhrases,
    suggestions,
    improvedPrompt,
    improvementRationale,
  };
}

/**
 * Searches for true input-output demonstration pairs in the text
 */
function extractDemonstrations(text: string): Demonstration[] {
  const results: Demonstration[] = [];

  // Pattern A: Input: ... Output: ... (or Q: ... A: ..., Question: ... Answer: ...)
  const ioPattern =
    /(?:(?:Example|Demo|Case)\s*\d*[:.-]?\s*)?(?:Input|Query|User|Question|Prompt|Q)[:]\s*([^\n\r]+(?:\n(?!(?:Output|Response|Assistant|Answer|A)[:])[^\n\r]+)*)\s*(?:Output|Response|Assistant|Answer|A)[:]\s*([^\n\r]+(?:\n(?!(?:(?:Example|Demo|Case)\s*\d*[:.-]?\s*)?(?:Input|Query|User|Question|Prompt|Q)[:])[^\n\r]+)*)/gi;

  let match: RegExpExecArray | null;
  while ((match = ioPattern.exec(text)) !== null) {
    const rawInput = (match[1] || "").trim();
    const rawOutput = (match[2] || "").trim();

    // Verify output isn't just an empty prompt prompt marker at the very end
    if (rawInput && rawOutput && rawOutput.length > 0 && !rawOutput.match(/^(?:\[insert\]|\.\.\.|\?)$/i)) {
      results.push({
        input: rawInput,
        output: rawOutput,
        rawSnippet: match[0].trim(),
      });
    }
  }

  if (results.length > 0) return results;

  // Pattern B: Arrow or equality demonstrations e.g. "cat" -> "animal", "2+2" => "4"
  const arrowPattern = /(?:^|\n)\s*["']?([^"'\n\r\->=]+)["']?\s*(?:->|=>|→|↦)\s*["']?([^"'\n\r]+)["']?(?=\n|$)/g;
  while ((match = arrowPattern.exec(text)) !== null) {
    const inp = match[1].trim();
    const out = match[2].trim();
    if (inp.length > 1 && out.length > 0 && !inp.toLowerCase().includes("note")) {
      results.push({
        input: inp,
        output: out,
        rawSnippet: match[0].trim(),
      });
    }
  }

  if (results.length > 0) return results;

  // Pattern C: JSON / Pair demonstration blocks
  const jsonPairPattern = /\{\s*["'](?:input|question|text)["']\s*:\s*["']([^"']+)["']\s*,\s*["'](?:output|answer|label|sentiment)["']\s*:\s*["']([^"']+)["']\s*\}/gi;
  while ((match = jsonPairPattern.exec(text)) !== null) {
    results.push({
      input: match[1].trim(),
      output: match[2].trim(),
      rawSnippet: match[0].trim(),
    });
  }

  return results;
}

function detectAdvancedTechniques(text: string): DetectedTechnique[] {
  const techniques: DetectedTechnique[] = [];

  // Role / Persona Prompting
  const roleRegex = /\b(?:you are an?|act as an?|your role is|as an? expert|pretend you are|take on the persona of)\b/i;
  const roleMatch = text.match(roleRegex);
  techniques.push({
    name: "Role Prompting",
    description: "Assigns a specific professional identity, persona, or domain expertise to the model.",
    detected: Boolean(roleMatch),
    evidence: roleMatch ? `Found persona marker: "${roleMatch[0]}"` : undefined,
  });

  // Instruction Prompting
  const instructionRegex = /\b(?:analyze|extract|generate|summarize|translate|classify|convert|evaluate|compute|write a|create a)\b/i;
  const instMatch = text.match(instructionRegex);
  techniques.push({
    name: "Instruction Prompting",
    description: "Uses explicit imperative directives telling the model precisely what operation to perform.",
    detected: Boolean(instMatch),
    evidence: instMatch ? `Imperative action verb: "${instMatch[0]}"` : undefined,
  });

  // Chain-of-Thought (CoT) Prompting
  const cotRegex = /\b(?:step-by-step|think step by step|chain of thought|show your reasoning|work through this step|break this down step|explain your logic first)\b/i;
  const cotMatch = text.match(cotRegex);
  techniques.push({
    name: "Chain-of-Thought (CoT)",
    description: "Instructs the model to output intermediate reasoning steps before arriving at a final answer.",
    detected: Boolean(cotMatch),
    evidence: cotMatch ? `Reasoning trigger: "${cotMatch[0]}"` : undefined,
  });

  // Structured Output Prompting
  const structRegex = /\b(?:json|xml|yaml|markdown table|csv|valid json schema|strict json|strictly in format)\b/i;
  const structMatch = text.match(structRegex);
  techniques.push({
    name: "Structured Output Prompting",
    description: "Demands responses adhering to rigorous structured serialization formats like JSON, XML, or tables.",
    detected: Boolean(structMatch),
    evidence: structMatch ? `Format specification: "${structMatch[0]}"` : undefined,
  });

  // Constraint-Based Prompting
  const constraintRegex = /\b(?:do not|must not|never|always|strictly|limit your response to|no conversational filler|only return|under no circumstances)\b/i;
  const constraintMatch = text.match(constraintRegex);
  techniques.push({
    name: "Constraint-Based Prompting",
    description: "Defines explicit boundaries, negative rules, or output length and content constraints.",
    detected: Boolean(constraintMatch),
    evidence: constraintMatch ? `Constraint marker: "${constraintMatch[0]}"` : undefined,
  });

  // Contextual Prompting
  const contextRegex = /\b(?:context:|background:|given the following|reference text:|source document:)\b/i;
  const contextMatch = text.match(contextRegex);
  techniques.push({
    name: "Contextual Prompting",
    description: "Supplies reference material, background scenario, or source documents for grounded reasoning.",
    detected: Boolean(contextMatch) || text.length > 350,
    evidence: contextMatch ? `Context delimiter: "${contextMatch[0]}"` : (text.length > 350 ? "Includes substantial background reference text." : undefined),
  });

  return techniques;
}

function calculateQualityScore(
  text: string,
  techniques: DetectedTechnique[],
  demonstrationCount: number
): PromptQualityScore {
  let clarity = 70;
  let specificity = 65;
  let context = 60;
  let roleDefinition = 40;
  let taskInstructions = 60;
  let constraints = 40;
  let outputFormat = 40;
  let inputRequirements = 50;

  // Role
  const hasRole = techniques.find((t) => t.name === "Role Prompting")?.detected;
  if (hasRole) roleDefinition = 95;

  // Task instruction
  const hasInstruction = techniques.find((t) => t.name === "Instruction Prompting")?.detected;
  if (hasInstruction) taskInstructions = 90;

  // Constraints
  const hasConstraints = techniques.find((t) => t.name === "Constraint-Based Prompting")?.detected;
  if (hasConstraints) constraints = 88;

  // Output format
  const hasFormat = techniques.find((t) => t.name === "Structured Output Prompting")?.detected;
  if (hasFormat) outputFormat = 92;

  // Context
  const hasContext = techniques.find((t) => t.name === "Contextual Prompting")?.detected;
  if (hasContext) context = 85;

  // Demonstrations bonus
  if (demonstrationCount > 0) {
    specificity += 15;
    clarity += 10;
  }

  // Length heuristics
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words < 8) {
    clarity -= 25;
    specificity -= 30;
    inputRequirements -= 25;
  } else if (words > 25) {
    specificity = Math.min(95, specificity + 15);
    clarity = Math.min(95, clarity + 10);
  }

  // Ensure 0-100 bounds
  const clamp = (val: number) => Math.max(10, Math.min(100, Math.round(val)));
  clarity = clamp(clarity);
  specificity = clamp(specificity);
  context = clamp(context);
  roleDefinition = clamp(roleDefinition);
  taskInstructions = clamp(taskInstructions);
  constraints = clamp(constraints);
  outputFormat = clamp(outputFormat);
  inputRequirements = clamp(inputRequirements);

  const overall = Math.round(
    clarity * 0.2 +
      specificity * 0.15 +
      taskInstructions * 0.2 +
      constraints * 0.15 +
      outputFormat * 0.15 +
      roleDefinition * 0.08 +
      context * 0.07
  );

  return {
    overall,
    clarity,
    specificity,
    context,
    roleDefinition,
    taskInstructions,
    constraints,
    outputFormat,
    inputRequirements,
  };
}

function identifyFlaws(
  text: string,
  quality: PromptQualityScore
): { missingInformation: string[]; ambiguousPhrases: string[] } {
  const missingInformation: string[] = [];
  const ambiguousPhrases: string[] = [];

  if (quality.roleDefinition < 60) {
    missingInformation.push("System persona / expert role definition is not specified.");
  }
  if (quality.constraints < 60) {
    missingInformation.push("Negative constraints or edge-case handling rules are absent.");
  }
  if (quality.outputFormat < 60) {
    missingInformation.push("Target output format (e.g., JSON, markdown list, character limit) is unspecified.");
  }
  if (quality.context < 60 && text.split(/\s+/).length < 20) {
    missingInformation.push("Background context or target audience is minimal.");
  }

  // Ambiguous words
  const vagueWords = [
    { word: "good", suggestion: "Define specific quality criteria or metrics instead of 'good'" },
    { word: "nice", suggestion: "Specify the exact tone or visual style instead of 'nice'" },
    { word: "as best as possible", suggestion: "State specific optimization goals instead of 'as best as possible'" },
    { word: "etc", suggestion: "Explicitly enumerate all required items rather than using 'etc.'" },
    { word: "simple", suggestion: "Clarify reading level or target audience rather than 'simple'" },
    { word: "quickly", suggestion: "LLMs don't experience time; specify token/length constraints instead" },
    { word: "some", suggestion: "State exact quantities or counts instead of 'some'" },
  ];

  for (const { word, suggestion } of vagueWords) {
    const reg = new RegExp(`\\b${word}\\b`, "i");
    if (reg.test(text)) {
      ambiguousPhrases.push(`Vague term "${word}": ${suggestion}`);
    }
  }

  return { missingInformation, ambiguousPhrases };
}

function generateSuggestions(
  text: string,
  technique: PromptShotTechnique,
  quality: PromptQualityScore,
  missing: string[]
): string[] {
  const suggestions: string[] = [];

  if (quality.outputFormat < 70) {
    suggestions.push(
      "Specify an explicit output format. For instance: 'Return your answer in a markdown table with columns [Feature, Impact, Implementation]' or 'Output valid JSON with schema {...}'."
    );
  }

  if (quality.roleDefinition < 60) {
    suggestions.push(
      "Add a professional persona framing: 'You are a Senior Security Engineer / Technical Lead with expertise in...'"
    );
  }

  if (quality.constraints < 70) {
    suggestions.push(
      "Add explicit negative constraints: 'Do not include conversational preamble or summaries', 'Limit to 3 paragraphs', or 'Flag any assumptions made'."
    );
  }

  if (technique === "zero-shot" && quality.overall < 75) {
    suggestions.push(
      "If the model struggles with formatting consistency, convert to One-Shot or Few-Shot by adding 1-2 concrete Input/Output demonstration pairs."
    );
  }

  if (!/\b(step-by-step|reasoning)\b/i.test(text) && text.length > 50) {
    suggestions.push(
      "For complex logic or mathematical problems, add: 'Think step-by-step before producing your final answer' to activate Chain-of-Thought reasoning."
    );
  }

  return suggestions.slice(0, 4);
}

function generateImprovedPrompt(
  prompt: string,
  systemPrompt: string | undefined,
  technique: PromptShotTechnique,
  quality: PromptQualityScore,
  suggestions: string[]
): { improvedPrompt: string; improvementRationale: string } {
  const parts: string[] = [];
  const rationales: string[] = [];

  // 1. Role / Persona
  if (quality.roleDefinition < 60 && !systemPrompt) {
    parts.push("You are an expert AI assistant specializing in clear, authoritative, and structured technical responses.");
    rationales.push("Added an expert persona to ground the tone and depth.");
  }

  // 2. Clear Task Directive
  parts.push(`### Task\n${prompt.trim()}`);

  // 3. Constraints & Guidelines
  const constraintsList: string[] = [];
  if (quality.constraints < 70) {
    constraintsList.push("- Provide high-signal answers with zero fluff or conversational filler.");
    constraintsList.push("- Maintain rigorous accuracy and cite key considerations where applicable.");
    rationales.push("Introduced explicit negative constraints to filter unnecessary fluff.");
  }

  // 4. Output Formatting
  if (quality.outputFormat < 70) {
    constraintsList.push("- Structure your output using clear markdown headings, bullet points, or tables.");
    rationales.push("Added structured formatting requirements for readability.");
  }

  if (constraintsList.length > 0) {
    parts.push(`### Guidelines & Constraints\n${constraintsList.join("\n")}`);
  }

  // 5. Example or Delimiter Structure
  if (technique === "one-shot" || technique === "few-shot") {
    rationales.push("Preserved and clearly delimited existing demonstration pairs.");
  } else {
    parts.push("### Format\nRespond directly starting with the solution.");
  }

  return {
    improvedPrompt: parts.join("\n\n"),
    improvementRationale:
      rationales.length > 0
        ? rationales.join(" ")
        : "Enhanced structure, added explicit section headers, and clarified constraints for higher model adherence.",
  };
}

function truncate(str: string, maxLen: number): string {
  if (!str) return "";
  const cleaned = str.replace(/\s+/g, " ").trim();
  return cleaned.length <= maxLen ? cleaned : cleaned.substring(0, maxLen) + "...";
}

function createEmptyAnalysisResult(): PromptAnalysisResult {
  return {
    technique: "zero-shot",
    confidence: 100,
    demonstrationsCount: 0,
    demonstrations: [],
    explanation: "Enter a prompt to analyze prompting techniques, quality metrics, and demonstrations.",
    evidence: [],
    ambiguityWarnings: [],
    detectedTechniques: [],
    qualityScore: {
      overall: 0,
      clarity: 0,
      specificity: 0,
      context: 0,
      roleDefinition: 0,
      taskInstructions: 0,
      constraints: 0,
      outputFormat: 0,
      inputRequirements: 0,
    },
    missingInformation: [],
    ambiguousPhrases: [],
    suggestions: [],
    improvedPrompt: "",
    improvementRationale: "",
  };
}

