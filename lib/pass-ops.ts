import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

const rpcClient = supabase as unknown as SupabaseClient;

export async function cancelPass(passId: string) {
  const { data, error } = await rpcClient.rpc("cancel_pass", {
    target_pass_id: passId,
  });

  if (error) {
    if (error.message.toLowerCase().includes("exhausted pass cannot be cancelled")) {
      throw new Error("Los bonos agotados no se pueden cancelar.");
    }
    throw error;
  }

  return data;
}
