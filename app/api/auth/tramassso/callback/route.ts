import { NextRequest, NextResponse } from "next/server";
import { exchangeTramasssoCode } from "@/lib/tramassso-sso";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function completionUrl(request: NextRequest) {
  const configured = process.env.BONOA_APP_URL;
  if (configured) {
    const url = new URL("/auth/tramassso/complete", configured);
    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
      throw new Error("BONOA_APP_URL must use HTTPS");
    }
    return url.toString();
  }

  if (process.env.VERCEL_URL) {
    return new URL("/auth/tramassso/complete", `https://${process.env.VERCEL_URL}`).toString();
  }

  return new URL("/auth/tramassso/complete", request.nextUrl.origin).toString();
}

function failed(request: NextRequest, reason = "1") {
  const response = NextResponse.redirect(new URL(`/login?sso_error=${encodeURIComponent(reason)}`, request.url), { status: 303 });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

function isExistingUserError(code: string | undefined) {
  return code === "email_exists" || code === "user_already_exists";
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code") ?? "";
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(code)) return failed(request);

  try {
    const identity = await exchangeTramasssoCode(code);
    const admin = getSupabaseAdmin();

    const { data: existingLink, error: linkLookupError } = await admin
      .from("external_identities")
      .select("user_id")
      .eq("provider", "tramassso")
      .eq("external_user_id", identity.id)
      .maybeSingle();
    if (linkLookupError) throw linkLookupError;

    let userId: string | null = existingLink?.user_id ?? null;
    let email = identity.email.trim().toLowerCase();

    if (userId) {
      const { data: mappedUser, error: mappedUserError } = await admin.auth.admin.getUserById(userId);
      if (mappedUserError || !mappedUser.user?.email) throw mappedUserError ?? new Error("mapped_user_missing");
      email = mappedUser.user.email;
    } else {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          display_name: identity.name?.trim() || identity.username,
          tramassso_user_id: identity.id,
        },
      });

      // Tramassso currently does not model a verified-email guarantee. Never link
      // an existing Bonoa account solely because its email happens to match the
      // Tramassso identity. Existing-account linking needs an explicit flow in
      // which the user proves control of both sessions.
      if (createError && isExistingUserError(createError.code)) {
        return failed(request, "link_required");
      }
      if (createError) throw createError;
      if (!created.user) throw new Error("sso_user_creation_failed");
      userId = created.user.id;
    }

    const { data: generated, error: generateError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: completionUrl(request),
        data: {
          display_name: identity.name?.trim() || identity.username,
          tramassso_user_id: identity.id,
        },
      },
    });
    if (generateError || !generated.properties?.action_link || !generated.user) {
      throw generateError ?? new Error("magic_link_generation_failed");
    }

    if (generated.user.id !== userId) throw new Error("identity_mapping_mismatch");

    const { error: mappingError } = await admin.from("external_identities").upsert({
      provider: "tramassso",
      external_user_id: identity.id,
      user_id: userId,
      email_snapshot: identity.email.trim().toLowerCase(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "provider,external_user_id" });
    if (mappingError) throw mappingError;

    const response = NextResponse.redirect(generated.properties.action_link, { status: 303 });
    response.headers.set("Cache-Control", "no-store, max-age=0");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  } catch {
    return failed(request);
  }
}
