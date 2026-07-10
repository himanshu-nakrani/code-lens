/**
 * Local smoke test for robust JSON parsing (no API key required).
 */
import { createRequire } from "module";
// Use ts via dynamic approach — reimplement core parse logic for smoke test

function parseAnalysisJson(raw) {
  const text = (raw ?? "").trim();
  if (!text) return { ok: false, error: "empty" };

  const attempts = [text];
  const fenced = text.replace(/^```(?:json|JSON)?\s*\n?/m, "").replace(/\n?```\s*$/m, "").trim();
  if (fenced !== text) attempts.push(fenced);
  const noFences = text.replace(/```(?:json|JSON)?\s*/gi, "").replace(/```/g, "").trim();
  if (!attempts.includes(noFences)) attempts.push(noFences);
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last > first) {
    const slice = text.slice(first, last + 1);
    if (!attempts.includes(slice)) attempts.push(slice);
  }

  for (const candidate of attempts) {
    try {
      const data = JSON.parse(candidate);
      if (data && typeof data === "object" && !Array.isArray(data)) {
        return { ok: true, result: data };
      }
    } catch {
      /* continue */
    }
  }
  return { ok: false, error: "parse failed", rawText: text };
}

const cases = [
  {
    name: "strict JSON",
    input: JSON.stringify({ explanation: "does stuff", improvements: ["a", "b"] }),
  },
  {
    name: "fenced JSON",
    input: '```json\n{"explanation":"hi","tests":{"framework":"jest","code":"test()"}}\n```',
  },
  {
    name: "prose + JSON",
    input: 'Here is the analysis:\n{"explanation":"ok","bug_fixes":{"summary":"none","issues":[],"fixed_code":"x"}}\nThanks!',
  },
  {
    name: "garbage",
    input: "not json at all",
  },
];

let failed = 0;
for (const c of cases) {
  const r = parseAnalysisJson(c.input);
  const expectOk = c.name !== "garbage";
  const pass = r.ok === expectOk;
  console.log(`${pass ? "✓" : "✗"} ${c.name}: ok=${r.ok}`);
  if (!pass) failed++;
}

process.exit(failed ? 1 : 0);
