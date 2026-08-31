import { chromium } from "playwright";

const baseUrl = (process.env.E2E_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");

function env(name) {
  return (process.env[name] || "").trim();
}

function log(message) {
  console.log(`[browser-e2e] ${message}`);
}

async function assertText(page, text) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: "visible", timeout: 10000 });
}

async function assertLoginRedirect(page, path) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForURL((url) => url.pathname === "/login" && url.searchParams.get("next") === path, { timeout: 10000 });
}

async function login(page, email, password, nextPath) {
  await page.goto(`${baseUrl}/login?next=${encodeURIComponent(nextPath)}`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: /Entrar/i }).click();
  await page.waitForURL((url) => url.pathname === nextPath, { timeout: 15000 });
}

async function runPublicChecks(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();

  const health = await context.request.get(`${baseUrl}/api/health`);
  if (!health.ok()) throw new Error(`Healthcheck returned ${health.status()}`);
  const healthJson = await health.json();
  if (healthJson?.status !== "ok" || healthJson?.service !== "bonoa") {
    throw new Error("Healthcheck payload is not the expected Bonoa response");
  }
  log("healthcheck OK");

  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
  await assertText(page, "Entra en tu wallet");
  log("login page OK");

  await assertLoginRedirect(page, "/wallet");
  await assertLoginRedirect(page, "/business");
  await assertLoginRedirect(page, "/admin");
  await assertLoginRedirect(page, "/negocios");
  log("protected-route redirects OK");

  await page.goto(`${baseUrl}/c/tramassso`, { waitUntil: "domcontentloaded" });
  await assertText(page, "Tramassso");
  log("public storefront OK");

  await context.close();
}

async function runBusinessChecks(browser) {
  const email = env("E2E_BUSINESS_EMAIL");
  const password = env("E2E_BUSINESS_PASSWORD");
  const businessId = env("E2E_BUSINESS_ID");

  if (!email || !password) {
    log("business authenticated checks skipped: E2E_BUSINESS_EMAIL/PASSWORD not configured");
    return;
  }

  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, email, password, "/business");
  await assertText(page, "Tus negocios");
  log("business login OK");

  if (businessId) {
    await page.goto(`${baseUrl}/business/${businessId}`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    if (page.url().includes("/onboarding")) {
      throw new Error("E2E_BUSINESS_ID points to a business with incomplete onboarding");
    }
    await assertText(page, "Qué está pasando y qué hacer ahora");

    await page.goto(`${baseUrl}/business/${businessId}/counter`, { waitUntil: "domcontentloaded" });
    await assertText(page, "Modo mostrador");
    log("business dashboard + counter OK");
  } else {
    log("business route checks completed; set E2E_BUSINESS_ID to also verify dashboard/counter");
  }

  await context.close();
}

async function runClientChecks(browser) {
  const email = env("E2E_CLIENT_EMAIL");
  const password = env("E2E_CLIENT_PASSWORD");

  if (!email || !password) {
    log("client authenticated checks skipped: E2E_CLIENT_EMAIL/PASSWORD not configured");
    return;
  }

  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, email, password, "/wallet");
  log("client login OK");

  for (const path of ["/wallet", "/qr", "/history", "/notifications", "/negocios"]) {
    await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
    await page.waitForURL((url) => url.pathname === path, { timeout: 10000 });
    const body = await page.locator("body").innerText();
    if (/No tienes acceso|Application error|Internal Server Error/i.test(body)) {
      throw new Error(`Client route ${path} rendered an error state`);
    }
  }
  log("client wallet/QR/history/notifications/directory OK");

  await context.close();
}

const browser = await chromium.launch({ headless: true });
try {
  await runPublicChecks(browser);
  await runBusinessChecks(browser);
  await runClientChecks(browser);
  log("PASS");
} catch (error) {
  console.error("[browser-e2e] FAIL", error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
