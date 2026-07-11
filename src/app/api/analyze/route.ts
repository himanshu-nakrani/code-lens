import { NextRequest, NextResponse } from "next/server";
import {
  buildAnalysisPrompt,
  callGrok,
  GrokApiError,
  GrokConfigError,
} from "@/lib/grok";
import { parseAnalysisJson } from "@/lib/parse";
import {
  redactSecrets,
  validateAnalyzeRequest,
} from "@/lib/analyze-request";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const validated = validateAnalyzeRequest(body);
  if (!validated.ok) {
    return NextResponse.json(
      { ok: false, error: validated.error },
      { status: validated.status }
    );
  }

  // Fail closed if key missing — never call with empty auth or mock results
  if (!process.env.XAI_API_KEY?.trim()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'XAI_API_KEY is not set. Generate a key at https://console.x.ai and run: export XAI_API_KEY="xai-..."',
      },
      { status: 503 }
    );
  }

  const prompt = buildAnalysisPrompt({
    language: validated.language,
    filename: validated.filename,
    code: validated.code,
    tasks: validated.tasks,
    multiFileContext: validated.multiFileContext,
    depth: validated.depth,
  });

  try {
    // Slightly higher temperature in deep mode for broader exploration
    const rawText = await callGrok(prompt, {
      temperature: validated.depth === "deep" ? 0.35 : 0.2,
    });
    const parsed = parseAnalysisJson(rawText);

    if (!parsed.ok) {
      return NextResponse.json({
        ok: false,
        error: redactSecrets(parsed.error),
        rawText: parsed.rawText,
        parseError: true,
      });
    }

    return NextResponse.json({
      ok: true,
      result: parsed.result,
      // raw model text for debug UI only — never includes API key
      rawText,
    });
  } catch (err) {
    if (err instanceof GrokConfigError) {
      return NextResponse.json(
        { ok: false, error: redactSecrets(err.message) },
        { status: 503 }
      );
    }
    if (err instanceof GrokApiError) {
      return NextResponse.json(
        {
          ok: false,
          error: redactSecrets(err.message),
          status: err.status,
        },
        { status: 502 }
      );
    }
    const message =
      err instanceof Error ? err.message : "Unexpected server error.";
    return NextResponse.json(
      { ok: false, error: redactSecrets(message) },
      { status: 500 }
    );
  }
}
