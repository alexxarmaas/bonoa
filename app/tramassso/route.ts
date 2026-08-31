import { NextResponse } from "next/server";

const DEFAULT_TRAMASSSO_URL = "https://www.tramassso.com";

export function GET() {
  const configured = process.env.NEXT_PUBLIC_TRAMASSSO_URL?.trim() || DEFAULT_TRAMASSSO_URL;

  try {
    const target = new URL(configured);
    if (target.protocol !== "https:" && target.hostname !== "localhost") {
      throw new Error("Unsupported Tramassso URL protocol");
    }
    return NextResponse.redirect(target);
  } catch {
    return NextResponse.redirect(DEFAULT_TRAMASSSO_URL);
  }
}
