import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "bonoa",
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
      capabilities: {
        permanentMemberships: true,
        qualifiedPurchaseGoals: true,
        visualLoyaltyProgress: true,
        transactionReceipts: true,
        notificationCenter: true,
        segmentedCampaigns: true,
        actionableBusinessDashboard: true,
        loyaltyCampaigns: true,
        automaticRewards: true,
        customerSegments: true,
        eventBasedLoyalty: true,
        purchaseAndVisitTracking: true,
        spendThresholdRewards: true,
        googleWalletReady: process.env.BONOA_NATIVE_WALLETS_ENABLED === "true" && Boolean(process.env.GOOGLE_WALLET_ISSUER_ID && process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_WALLET_PRIVATE_KEY),
        appleWalletReady: process.env.BONOA_NATIVE_WALLETS_ENABLED === "true" && Boolean(process.env.APPLE_WALLET_SIGNER_URL && process.env.APPLE_WALLET_SIGNER_TOKEN),
      },
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
