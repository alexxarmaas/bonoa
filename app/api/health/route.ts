import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "bonoa",
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
      capabilities: {
        loyaltyCampaigns: true,
        automaticRewards: true,
        customerSegments: true,
        eventBasedLoyalty: true,
        purchaseAndVisitTracking: true,
        spendThresholdRewards: true,
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
