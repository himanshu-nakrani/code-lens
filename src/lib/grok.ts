/**
 * Server-only helper for xAI Responses API.
 * Never import this module into client components.
 */

import "server-only";

import type { AnalysisDepth } from "./types";

const XAI_RESPONSES_URL = "https://api.x.ai/v1/responses";
const MODEL = "grok-4.5";

export class GrokConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GrokConfigError";
  }
}

export class GrokApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "GrokApiError";
    this.status = status;
  }
}

export function getApiKey(): string {
  const key = process.env.XAI_API_KEY;
  if (!key || !key.trim()) {
    throw new GrokConfigError(
      'XAI_API_KEY is not set. Generate a key at https://console.x.ai and run: export XAI_API_KEY="xai-..."'
    );
  }
  return key.trim();
}

interface ResponsesApiBody {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  error?: { message?: string };
}

/**
 * Extract text from Responses API payload.
 * Prefer output_text; fall back to joining output[].content[] where type === "output_text".
 */
export function extractOutputText(data: ResponsesApiBody): string {
  if (typeof data.output_text === "string" && data.output_text.length > 0) {
    return data.output_text;
  }

  const parts: string[] = [];
  if (Array.isArray(data.output)) {
    for (const item of data.output) {
      if (!item || !Array.isArray(item.content)) continue;
      for (const c of item.content) {
        if (c && c.type === "output_text" && typeof c.text === "string") {
          parts.push(c.text);
        }
      }
    }
  }
  return parts.join("\n");
}

export async function callGrok(
  input: string,
  opts?: { temperature?: number }
): Promise<string> {
  const apiKey = getApiKey();
  const temperature = opts?.temperature ?? 0.2;

  const res = await fetch(XAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      input,
      temperature,
    }),
  });

  if (!res.ok) {
    let detail = res.statusText || "Request failed";
    try {
      const errBody = (await res.json()) as {
        error?: { message?: string; code?: string; type?: string } | string;
        message?: string;
      };
      const errField = errBody?.error;
      const msg =
        (typeof errField === "string" ? errField : errField?.message) ||
        errBody?.message;
      if (msg && typeof msg === "string") {
        // Never echo secrets; keep message short and safe
        detail = msg.slice(0, 300).replace(/xai-[a-zA-Z0-9_-]+/g, "[redacted]");
      }
    } catch {
      // ignore body parse errors
    }
    throw new GrokApiError(res.status, `xAI API error (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as ResponsesApiBody;
  const text = extractOutputText(data);
  if (!text) {
    throw new GrokApiError(502, "xAI API returned an empty response body.");
  }
  return text;
}

const FINDING_SCHEMA = `{
  "title": string,
  "detail": string,
  "severity": "critical" | "high" | "medium" | "low" | "info",
  "line": number | omit if unknown (1-based),
  "endLine": number | omit,
  "category": string,
  "suggestion": string,
  "ruleId": string | omit (e.g. CWE-79, OWASP A03)
}`;

export function buildAnalysisPrompt(opts: {
  language: string;
  filename: string;
  code: string;
  tasks: string[];
  multiFileContext?: string;
  depth?: AnalysisDepth;
}): string {
  const taskSet = new Set(opts.tasks);
  const depth = opts.depth ?? "standard";
  const deep = depth === "deep";

  const want: string[] = [];
  if (taskSet.has("explain")) {
    want.push(
      deep
        ? `- "explanation": string — thorough walkthrough: purpose, control flow, data flow, edge cases, public API contracts`
        : `- "explanation": string — plain-English explanation of what the code does`
    );
  }
  if (taskSet.has("fix_bugs")) {
    want.push(
      `- "bug_fixes": object with:
    - "summary": string
    - "issues": string array (short human labels)
    - "structured_issues": array of finding objects ${FINDING_SCHEMA}
    - "fixed_code": full corrected source as one string
  Prefer real defects (logic, nulls, races, off-by-ones, resource leaks). Include line numbers when possible.`
    );
  }
  if (taskSet.has("generate_tests")) {
    want.push(
      deep
        ? `- "tests": object with "framework" (string), "code" (full unit test source covering happy path, edges, error paths, and regressions for any bugs found), "coverage_notes" (string array of what each group covers)`
        : `- "tests": object with "framework" (string), "code" (full unit test source), optional "coverage_notes" (string array)`
    );
  }
  if (taskSet.has("suggest_improvements")) {
    want.push(
      `- "improvements": string array of actionable refactors / quality / performance suggestions (prioritize high-impact first)`
    );
  }
  if (taskSet.has("security_audit")) {
    want.push(
      `- "security": object with:
    - "summary": string
    - "risk_level": "critical" | "high" | "medium" | "low" | "info"
    - "findings": array of finding objects ${FINDING_SCHEMA}
  Cover injection, XSS, authz, secrets, unsafe deserialization, path traversal, crypto misuse, SSRF, etc. Only report plausible issues for this language/stack.`
    );
  }
  if (taskSet.has("architecture")) {
    want.push(
      `- "architecture": object with:
    - "summary": string
    - "coupling": "low" | "medium" | "high"
    - "cohesion": "low" | "medium" | "high"
    - "hotspots": array of finding objects (complexity / module boundaries / smells, with line when possible)
    - "recommendations": string array of structural improvements`
    );
  }

  // Always ask for quality dimensions when multiple advanced tasks run
  const wantQuality =
    deep ||
    taskSet.has("security_audit") ||
    taskSet.has("architecture") ||
    taskSet.size >= 3;
  if (wantQuality) {
    want.push(
      `- "quality": object with optional 0–100 scores: "correctness", "security", "maintainability", "testability", "complexity" (higher complexity score = worse / more complex)`
    );
  }

  const depthBlock = deep
    ? `\nAnalysis depth: DEEP — be exhaustive. Cite line numbers aggressively. Prefer false negatives over vague filler. If no issues exist, say so clearly with empty arrays.\n`
    : `\nAnalysis depth: STANDARD — precise and actionable, not verbose.\n`;

  const contextBlock = opts.multiFileContext
    ? `\nAdditional codebase context (other files, may be truncated):\n\`\`\`\n${opts.multiFileContext}\n\`\`\`\n`
    : "";

  return `You are Code Lens, a senior staff engineer performing production-grade static analysis.

CRITICAL OUTPUT RULES:
- Return STRICT JSON only.
- No markdown fences.
- No prose before or after the JSON.
- Escape newlines and quotes inside string values correctly.
- Only include keys for the tasks that were requested (plus "quality" when requested above).
- For fixed_code and tests.code, return the complete source as a single JSON string.
- Line numbers are 1-based and refer to the primary source below.
- severity must be one of: critical, high, medium, low, info.

Use exactly these keys when requested:
{
${want.join(",\n")}
}

Tasks requested: ${opts.tasks.join(", ")}
${depthBlock}
Primary file: ${opts.filename}
Language: ${opts.language}
${contextBlock}
Source code to analyze:
\`\`\`${opts.language}
${opts.code}
\`\`\`
`;
}
