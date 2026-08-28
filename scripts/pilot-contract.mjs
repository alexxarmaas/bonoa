const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");

const checks = [
  ["directory", "/negocios", 200],
  ["business create", "/business", 200],
  ["public storefront", "/c/tramassso", 200],
  ["customer wallet", "/wallet", 200],
  ["customer qr", "/qr", 200],
  ["history", "/history", 200],
  ["notifications", "/notifications", 200],
];

let failed = false;
for (const [label, path, status] of checks) {
  try {
    const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
    if (response.status !== status) {
      console.error(`FAIL ${label}: ${path} expected ${status}, got ${response.status}`);
      failed = true;
    } else {
      console.log(`PASS ${label}: ${path}`);
    }
  } catch (error) {
    console.error(`FAIL ${label}:`, error);
    failed = true;
  }
}

try {
  const response = await fetch(`${baseUrl}/api/health`);
  const value = await response.json();
  const required = [
    "permanentMemberships",
    "qualifiedPurchaseGoals",
    "visualLoyaltyProgress",
    "transactionReceipts",
    "notificationCenter",
    "segmentedCampaigns",
    "actionableBusinessDashboard",
    "automaticRewards",
    "customerSegments",
  ];
  const missing = required.filter((key) => value?.capabilities?.[key] !== true);
  if (response.status !== 200 || value?.status !== "ok" || missing.length) {
    console.error(`FAIL pilot health contract; missing: ${missing.join(", ") || "health"}`);
    failed = true;
  } else {
    console.log("PASS pilot health contract");
  }
} catch (error) {
  console.error("FAIL pilot health contract:", error);
  failed = true;
}

if (failed) process.exit(1);
console.log("Bonoa pilot contract checks passed.");
