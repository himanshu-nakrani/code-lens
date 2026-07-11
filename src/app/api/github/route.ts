import { NextRequest, NextResponse } from "next/server";
import { parseGitHubInput } from "@/lib/github-url";
import { ingestGitHubRepo } from "@/lib/github-fetch";
import { redactSecrets } from "@/lib/analyze-request";

/**
 * POST /api/github
 * Body: { input: string, ref?: string, subdir?: string }
 * Fetches a public (or token-authorized private) GitHub repo into workspace files.
 */
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

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const b = body as { input?: unknown; ref?: unknown; subdir?: unknown };
  const input = typeof b.input === "string" ? b.input : "";
  const parsed = parseGitHubInput(input);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, error: parsed.error },
      { status: 400 }
    );
  }

  // Allow body overrides of URL-derived ref/subdir
  if (typeof b.ref === "string" && b.ref.trim()) {
    parsed.value.ref = b.ref.trim();
  }
  if (typeof b.subdir === "string" && b.subdir.trim()) {
    parsed.value.subdir = b.subdir.trim().replace(/^\/+|\/+$/g, "");
  }

  try {
    const result = await ingestGitHubRepo(parsed.value);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: redactSecrets(result.error) },
        { status: result.status >= 400 && result.status < 600 ? result.status : 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      repo: result.repo,
      files: result.files,
      skipped: result.skipped,
      truncated: result.truncated,
      warnings: result.warnings,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unexpected error loading repository.";
    return NextResponse.json(
      { ok: false, error: redactSecrets(message) },
      { status: 500 }
    );
  }
}
