const origin = "https://bonoa.tramassso.com";

async function check(label, run) {
  let last;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try { await run(); console.log("PASS " + label); return; }
    catch (error) { last = error; if (attempt === 1) await new Promise(resolve => setTimeout(resolve, 2000)); }
  }
  throw new Error(label + ": " + (last instanceof Error ? last.message : "request failed"));
}
async function request(path, options = {}) {
  const response = await fetch(new URL(path, origin), { ...options, signal: AbortSignal.timeout(12000), redirect: "manual", cache: "no-store" });
  if (!response.ok) throw new Error("HTTP " + response.status);
  return response;
}
await check("public health", async () => {
  const data = await (await request("/api/health")).json();
  if (data.status !== "ok" || data.service !== "bonoa") throw new Error("invalid health contract");
});
await check("web-only capability", async () => {
  const data = await (await request("/api/wallet/capabilities")).json();
  if (data.google !== false || data.apple !== false) throw new Error("native wallets unexpectedly enabled");
});
for (const path of ["/login", "/register", "/forgot-password"]) {
  await check(path, async () => {
    const response = await request(path);
    if (!response.headers.get("content-type")?.includes("text/html")) throw new Error("expected HTML");
  });
}
await check("Supabase public data path", async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("public Supabase config missing");
  const response = await fetch(new URL("/rest/v1/rpc/public_business_loyalty_program", url), {
    method: "POST", headers: { apikey: key, "content-type": "application/json" },
    body: JSON.stringify({ target_slug: "tramassso" }), signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("HTTP " + response.status);
  if (!Array.isArray(await response.json())) throw new Error("unexpected public RPC response");
});
console.log("Production availability checks passed (no private accounts or mutations).");
