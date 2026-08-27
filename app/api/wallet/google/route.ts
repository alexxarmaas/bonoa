import { createSign } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

type Membership = {
  membership_id: string;
  business_id: string;
  business_name: string;
  business_logo_url: string | null;
  business_accent_color: string;
  joined_at: string;
  purchases: number;
  visits: number;
  rewards_earned: number;
};

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function signJwt(payload: Record<string, unknown>, privateKey: string) {
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const body = base64Url(JSON.stringify(payload));
  const unsigned = `${header}.${body}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  return `${unsigned}.${signer.sign(privateKey).toString("base64url")}`;
}

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
  const serviceAccountEmail = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_WALLET_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!url || !publishableKey) return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  if (!issuerId || !serviceAccountEmail || !privateKey) return NextResponse.json({ error: "google_wallet_not_configured" }, { status: 503 });

  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearer) return NextResponse.json({ error: "authentication_required" }, { status: 401 });

  const body = await request.json().catch(() => null) as { membershipId?: string } | null;
  if (!body?.membershipId) return NextResponse.json({ error: "membership_required" }, { status: 400 });

  const supabase = createClient(url, publishableKey, {
    global: { headers: { Authorization: `Bearer ${bearer}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser(bearer);
  if (authError || !authData.user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });

  const { data: memberships, error: membershipError } = await supabase.rpc("wallet_memberships");
  if (membershipError) return NextResponse.json({ error: "wallet_lookup_failed" }, { status: 500 });

  const membership = (memberships as Membership[] | null)?.find((item) => item.membership_id === body.membershipId);
  if (!membership) return NextResponse.json({ error: "membership_not_found" }, { status: 404 });

  const classId = `${issuerId}.bonoa_membership`;
  const objectSuffix = `membership_${membership.membership_id.replace(/-/g, "")}`;
  const objectId = `${issuerId}.${objectSuffix}`;
  const origin = new URL(request.url).origin;
  const liveQrUrl = new URL("/qr", origin).toString();
  const accent = /^#[0-9a-f]{6}$/i.test(membership.business_accent_color || "") ? membership.business_accent_color : "#ff5a1f";

  const genericClass = { id: classId };
  const genericObject = {
    id: objectId,
    classId,
    state: "ACTIVE",
    cardTitle: { defaultValue: { language: "es-ES", value: "Bonōa" } },
    header: { defaultValue: { language: "es-ES", value: membership.business_name } },
    subheader: { defaultValue: { language: "es-ES", value: "Carnet de fidelización" } },
    hexBackgroundColor: accent,
    textModulesData: [
      { id: "member_since", header: "SOCIO DESDE", body: new Date(membership.joined_at).toLocaleDateString("es-ES", { month: "long", year: "numeric" }) },
      { id: "purchases", header: "COMPRAS", body: String(membership.purchases) },
      { id: "visits", header: "VISITAS", body: String(membership.visits) },
      { id: "rewards", header: "PREMIOS", body: String(membership.rewards_earned) },
      { id: "qr_security", header: "QR SEGURO", body: "Abre Bonoa para mostrar tu QR vigente. Así un QR antiguo nunca queda válido en tu carnet." },
    ],
    linksModuleData: {
      uris: [
        { uri: liveQrUrl, description: "Abrir mi QR Bonōa", id: "bonoa-live-qr" },
        { uri: origin, description: "Abrir mi wallet Bonōa", id: "bonoa-wallet" },
      ],
    },
  } as Record<string, unknown>;

  if (membership.business_logo_url?.startsWith("https://")) {
    genericObject.logo = {
      sourceUri: { uri: membership.business_logo_url },
      contentDescription: { defaultValue: { language: "es-ES", value: membership.business_name } },
    };
  }

  const token = signJwt({
    iss: serviceAccountEmail,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    origins: [new URL(origin).host],
    payload: { genericClasses: [genericClass], genericObjects: [genericObject] },
  }, privateKey);

  return NextResponse.json({ url: `https://pay.google.com/gp/v/save/${token}` });
}
