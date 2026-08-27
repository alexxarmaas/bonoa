import { NextRequest, NextResponse } from "next/server";

const MAX_TEXT = 500;
const MAX_BODY_BYTES = 4096;

function clean(value: unknown) {
  if (typeof value !== "string") return null;
  return value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, "[id]")
    .slice(0, MAX_TEXT);
}

export async function POST(request: NextRequest) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "same-site") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false }, { status: 413 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const entry = {
    event: "bonoa_client_error",
    message: clean(payload.message),
    name: clean(payload.name),
    digest: clean(payload.digest),
    path: clean(payload.path),
    userAgent: clean(request.headers.get("user-agent")),
    occurredAt: new Date().toISOString(),
  };

  if (!entry.message) return NextResponse.json({ ok: false }, { status: 400 });

  console.error(JSON.stringify(entry));
  return NextResponse.json({ ok: true });
}
