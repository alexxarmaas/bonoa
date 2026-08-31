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

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const signerUrl = process.env.APPLE_WALLET_SIGNER_URL;
  const signerToken = process.env.APPLE_WALLET_SIGNER_TOKEN;

  if (!url || !publishableKey) return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  if (!signerUrl || !signerToken) return NextResponse.json({ error: "apple_wallet_not_configured" }, { status: 503 });

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

  const liveQrUrl = new URL("/qr", request.url).toString();
  const response = await fetch(signerUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${signerToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      serialNumber: membership.membership_id,
      organizationName: "Bonōa",
      description: `Carnet de fidelización · ${membership.business_name}`,
      businessName: membership.business_name,
      logoUrl: membership.business_logo_url,
      accentColor: membership.business_accent_color,
      joinedAt: membership.joined_at,
      purchases: membership.purchases,
      visits: membership.visits,
      rewardsEarned: membership.rewards_earned,
      liveQrUrl,
      walletUrl: new URL("/", request.url).toString(),
      securityNote: "El carnet no incrusta una copia del QR. El enlace abre siempre el QR vigente de Bonoa.",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json({ error: "apple_wallet_signing_failed" }, { status: 502 });
  }

  const pass = await response.arrayBuffer();
  return new NextResponse(pass, {
    status: 200,
    headers: {
      "content-type": "application/vnd.apple.pkpass",
      "content-disposition": `attachment; filename="bonoa-${membership.membership_id}.pkpass"`,
      "cache-control": "private, no-store",
    },
  });
}
