# Code Lens

Drop in a codebase (folder or file) and analyze it with **grok-4.5** via the xAI Responses API.

**Tasks:** Explain · Fix Bugs · Generate Tests · Suggest Improvements

Browser-side File API uploads, syntax highlighting, and **real** API calls only — no mocked analysis output.

## Prerequisites

- Node.js 18+
- An xAI API key from [https://console.x.ai](https://console.x.ai)

## Install & env setup

```bash
cd code-lens
npm install

# Required — dev/start refuse to boot without this
export XAI_API_KEY="xai-..."

# Or create .env / .env.local in the project root:
# XAI_API_KEY=xai-...
```

Generate a key at: **https://console.x.ai**

## Scripts

| Script | What it does |
|--------|----------------|
| `npm run dev` | Preflight key check → Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Preflight key check → production server |
| `npm test` | Unit tests (Vitest) against shipped modules |
| `npm run lint` | ESLint |
| `npm run check-key` | Key preflight only |

```bash
npm run dev      # http://localhost:3000
npm test
npm run build
npm run start
npm run lint
```

## One-minute demo

1. `export XAI_API_KEY="xai-..."` then `npm run dev`
2. Open [http://localhost:3000](http://localhost:3000)
3. Click **JS bug** (or **Py edge** / **TS util**) — or **Load & Analyze** on a sample card
4. Leave task chips enabled (or use presets: Full / Bugs / Tests / Quality)
5. Click **Analyze** (or press **⌘/Ctrl + Enter**)
6. Confirm right-hand panels: explanation, bug fixes (with Diff), tests, improvements

Optional: **⌘K** command palette · **⌘F** find in file · **⌘⇧P** paste code

## Architecture & security

| Layer | Role |
|--------|------|
| Browser | Drop zone / paste / samples, file tree, code viewer, task toggles |
| `POST /api/analyze` | Validates body → server-only Grok helper → parse JSON |
| `GET /api/health` | `{ ok, hasKey, model }` — never returns secrets |
| `src/lib/grok.ts` | `server-only` → `POST https://api.x.ai/v1/responses` model `grok-4.5` |

- `XAI_API_KEY` is read only on the server from the environment.
- It is never sent to the client, logged, or returned in API responses.
- Missing key: preflight exits non-zero; analyze returns **503** with setup text pointing at console.x.ai.
- Client components must not import `@/lib/grok` (enforced by tests).

## Upload safety

- Text/source files only (extension + binary content sniffing)
- Max **200 KB** per file, **2 MB** total, **80** files
- Skipped / truncated files surface reasons in the UI

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Vitest for unit tests
- `react-syntax-highlighter` (Prism / oneDark)
- xAI Responses API (`grok-4.5`)
