import "server-only";

export type TramasssoIdentity = {
  id: string;
  email: string;
  name: string | null;
  username: string;
};

function exchangeUrl() {
  const configured = process.env.TRAMASSSO_SSO_EXCHANGE_URL
    ?? `${process.env.NEXT_PUBLIC_TRAMASSSO_URL ?? "https://tramassso.com"}/api/bonoa/sso/exchange`;
  const url = new URL(configured);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";

  if ((!local && url.protocol !== "https:") || (local && !["http:", "https:"].includes(url.protocol))) {
    throw new Error("TRAMASSSO_SSO_EXCHANGE_URL debe usar HTTPS fuera de local.");
  }
  if (url.username || url.password) throw new Error("La URL de intercambio no puede contener credenciales.");
  return url;
}

function isIdentity(value: unknown): value is TramasssoIdentity {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === "string"
    && typeof candidate.email === "string"
    && candidate.email.includes("@")
    && typeof candidate.username === "string"
    && (candidate.name === null || typeof candidate.name === "string");
}

export async function exchangeTramasssoCode(code: string) {
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(code)) throw new Error("invalid_sso_code");

  const response = await fetch(exchangeUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ code }),
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) throw new Error("sso_exchange_failed");
  const body: unknown = await response.json();
  if (!isIdentity(body)) throw new Error("invalid_sso_identity");
  return body;
}
