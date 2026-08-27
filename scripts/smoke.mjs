const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");

const checks = [
  { path: "/", status: 200 },
  { path: "/login", status: 200 },
  { path: "/register", status: 200 },
  { path: "/forgot-password", status: 200 },
  { path: "/reset-password", status: 200 },
  { path: "/demo/business", status: 200 },
  { path: "/promo/smoke-test-code", status: 200 },
  { path: "/sw.js", status: 200 },
  { path: "/manifest.webmanifest", status: 200, json: (value) => value?.name === "Bonoa" && value?.display === "standalone" && value?.start_url === "/wallet" },
  {
    path: "/api/health",
    status: 200,
    json: (value) => value?.status === "ok"
      && value?.service === "bonoa"
      && value?.capabilities?.permanentMemberships === true
      && value?.capabilities?.qualifiedPurchaseGoals === true
      && value?.capabilities?.visualLoyaltyProgress === true
      && value?.capabilities?.transactionReceipts === true
      && value?.capabilities?.notificationCenter === true
      && value?.capabilities?.segmentedCampaigns === true
      && value?.capabilities?.actionableBusinessDashboard === true
      && value?.capabilities?.loyaltyCampaigns === true
      && value?.capabilities?.automaticRewards === true
      && value?.capabilities?.customerSegments === true,
  },
  {
    path: "/api/wallet/capabilities",
    status: 200,
    json: (value) => typeof value?.google === "boolean" && typeof value?.apple === "boolean",
  },
  { path: "/__bonoa_missing_route__", status: 404 },
];

let failed = false;

for (const check of checks) {
  const url = `${baseUrl}${check.path}`;
  try {
    const response = await fetch(url, { redirect: "manual" });
    const contentType = response.headers.get("content-type") ?? "";
    const body = await response.text();

    if (response.status !== check.status) {
      console.error(`FAIL ${check.path}: expected ${check.status}, got ${response.status}`);
      failed = true;
      continue;
    }

    if (check.json) {
      if (!contentType.includes("json")) {
        console.error(`FAIL ${check.path}: expected JSON response`);
        failed = true;
        continue;
      }
      let value;
      try {
        value = JSON.parse(body);
      } catch {
        console.error(`FAIL ${check.path}: invalid JSON`);
        failed = true;
        continue;
      }
      if (!check.json(value)) {
        console.error(`FAIL ${check.path}: JSON assertion failed`);
        failed = true;
        continue;
      }
    }

    console.log(`PASS ${check.path} (${response.status})`);
  } catch (error) {
    console.error(`FAIL ${check.path}:`, error);
    failed = true;
  }
}

try {
  const response = await fetch(`${baseUrl}/wallet?source=technical-domain`, {
    headers: { "x-forwarded-host": "bonoa.vercel.app" },
    redirect: "manual",
  });
  const location = response.headers.get("location");
  const expected = "https://bonoa.tramassso.com/wallet?source=technical-domain";

  if (response.status !== 308 || location !== expected) {
    console.error(`FAIL canonical domain redirect: expected 308 -> ${expected}, got ${response.status} -> ${location}`);
    failed = true;
  } else {
    console.log("PASS canonical domain redirect (308)");
  }
} catch (error) {
  console.error("FAIL canonical domain redirect:", error);
  failed = true;
}

if (failed) process.exit(1);
console.log("Bonoa smoke checks passed.");
