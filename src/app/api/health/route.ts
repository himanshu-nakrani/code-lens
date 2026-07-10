import { NextResponse } from "next/server";

/**
 * Safe health check — never returns the API key or any secret material.
 */
export async function GET() {
  const hasKey = Boolean(process.env.XAI_API_KEY?.trim());
  const body = {
    ok: true as const,
    hasKey,
    model: "grok-4.5",
    service: "code-lens",
  };
  // Defense in depth: never attach env secrets to the payload
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
