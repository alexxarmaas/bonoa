import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error("Missing Supabase environment variables");
}

const client = createClient<Database>(supabaseUrl, supabasePublishableKey, {
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
