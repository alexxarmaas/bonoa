import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const JWT_FUTURE_RETRY_DELAY_MS = 2000;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error("Missing Supabase environment variables");
}

async function isJwtIssuedAtFuture(response: Response) {
  if (response.status !== 401) return false;

  try {
    const payload = await response.clone().json() as { code?: unknown; message?: unknown };
    return payload.code === "PGRST303"
      && String(payload.message ?? "").toLowerCase().includes("jwt issued at future");
  } catch {
    return false;
  }
}

const resilientFetch: typeof fetch = async (input, init) => {
  const request = new Request(input, init);
  const retryRequest = request.clone();
  const response = await globalThis.fetch(request);

  if (!await isJwtIssuedAtFuture(response)) return response;

  // Managed Supabase can transiently reject a freshly refreshed Auth JWT when
  // PostgREST's validator clock trails the Auth issuer. The first request is
  // rejected before reaching application SQL, so replaying it once is safe.
  await new Promise((resolve) => setTimeout(resolve, JWT_FUTURE_RETRY_DELAY_MS));
  return globalThis.fetch(retryRequest);
};

const client = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  global: {
    fetch: resilientFetch,
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Some feature modules keep a typed reference to `supabase.rpc`. Supabase's
// implementation expects the method to retain its client context (`this.rest`),
// so bind it once at the shared client boundary to make those references safe.
Object.defineProperty(client, "rpc", {
  value: client.rpc.bind(client),
  configurable: true,
  writable: true,
});

export const supabase = client;
