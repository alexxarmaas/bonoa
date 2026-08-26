const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");

const checks = [
  { path: "/login", status: 200 },
  { path: "/register", status: 200 },
  { path: "/forgot-password", status: 200 },
  { path: "/reset-password", status: 200 },
  { path: "/manifest.webmanifest", status: 200, json: (value) => value?.name === "Bonoa" && value?.display === "standalone" },
  { path: "/api/health", status: 200, json: (value) => value?.status === "ok" && value?.service === "bonoa" },
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

if (failed) process.exit(1);
console.log("Bonoa smoke checks passed.");
