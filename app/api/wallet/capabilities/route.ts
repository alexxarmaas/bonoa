import { NextResponse } from "next/server";

export async function GET() {
  const google = Boolean(
    process.env.GOOGLE_WALLET_ISSUER_ID &&
    process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_WALLET_PRIVATE_KEY,
  );
  const apple = Boolean(
    process.env.APPLE_WALLET_SIGNER_URL &&
    process.env.APPLE_WALLET_SIGNER_TOKEN,
  );

  return NextResponse.json({ google, apple });
}
