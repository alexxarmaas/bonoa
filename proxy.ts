import { NextRequest, NextResponse } from "next/server";

const DEFAULT_CANONICAL_ORIGIN = "https://bonoa.tramassso.com";

function requestHost(request: NextRequest) {
  return (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "")
    .split(":")[0]
    .trim()
    .toLowerCase();
}

function canonicalOrigin() {
  const configured = process.env.BONOA_APP_URL?.trim();
  if (!configured) return DEFAULT_CANONICAL_ORIGIN;

  try {
    return new URL(configured).origin;
  } catch {
    return DEFAULT_CANONICAL_ORIGIN;
  }
}

export function proxy(request: NextRequest) {
  const host = requestHost(request);
  const isPublicVercelAlias = host === "bonoa.vercel.app";
  const isProductionVercelHost = process.env.VERCEL_ENV === "production" && host.endsWith(".vercel.app");

  if (!isPublicVercelAlias && !isProductionVercelHost) {
    return NextResponse.next();
  }

  const destination = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, canonicalOrigin());
  return NextResponse.redirect(destination, 308);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
