#!/usr/bin/env node
/**
 * Pre-flight: refuse to start without XAI_API_KEY.
 * Loads .env / .env.local (Next.js convention) if present, then checks.
 * Wired into npm run dev / start.
 */
const fs = require("fs");
const path = require("path");

function loadEnvFile(filename) {
  const full = path.join(process.cwd(), filename);
  if (!fs.existsSync(full)) return;
  const text = fs.readFileSync(full, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    // Do not override an already-exported env var
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const key = process.env.XAI_API_KEY;

if (!key || !String(key).trim()) {
  console.error(`
┌──────────────────────────────────────────────────────────────┐
│  Code Lens — missing XAI_API_KEY                             │
├──────────────────────────────────────────────────────────────┤
│  Analysis requires a real xAI API key.                       │
│                                                              │
│  1. Generate a key at:  https://console.x.ai                 │
│  2. Export it in this terminal:                              │
│                                                              │
│     export XAI_API_KEY="xai-..."                             │
│                                                              │
│  Or create .env.local in the project root:                   │
│                                                              │
│     XAI_API_KEY=xai-...                                      │
│                                                              │
│  3. Re-run:  npm run dev                                     │
└──────────────────────────────────────────────────────────────┘
`);
  process.exit(1);
}

console.log("✓ XAI_API_KEY is set — starting Code Lens.");
