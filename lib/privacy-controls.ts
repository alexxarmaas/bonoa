import { supabase } from "@/lib/supabase/client";

type RpcError = { message: string };
type RpcResult<T> = PromiseLike<{ data: T | null; error: RpcError | null }>;
type RpcClient = <T>(fn: string, args?: Record<string, unknown>) => RpcResult<T>;

const rpc = supabase.rpc as unknown as RpcClient;

export type PrivacyPreferences = {
  marketing_emails: boolean;
  product_updates: boolean;
  updated_at: string | null;
};

export type AccountDeletionRequest = {
  request_id: string;
  status: "pending" | "cancelled" | "completed";
  requested_at: string;
  cancelled_at: string | null;
  completed_at: string | null;
};

function first<T>(data: T[] | null, fallback: string): T {
  const value = data?.[0];
  if (!value) throw new Error(fallback);
  return value;
}

export async function getPrivacyPreferences(): Promise<PrivacyPreferences> {
  const { data, error } = await rpc<PrivacyPreferences[]>("my_privacy_preferences");
  if (error) throw error;
  return first(data, "No se pudieron cargar tus preferencias de privacidad.");
}

export async function savePrivacyPreferences(input: {
  marketingEmails: boolean;
  productUpdates: boolean;
}): Promise<PrivacyPreferences> {
  const { data, error } = await rpc<PrivacyPreferences[]>("save_my_privacy_preferences", {
    next_marketing_emails: input.marketingEmails,
    next_product_updates: input.productUpdates,
  });
  if (error) throw error;
  return first(data, "No se pudieron guardar tus preferencias de privacidad.");
}

export async function getAccountDeletionRequest(): Promise<AccountDeletionRequest | null> {
  const { data, error } = await rpc<AccountDeletionRequest[]>("my_account_deletion_request");
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function requestAccountDeletion(): Promise<AccountDeletionRequest> {
  const { data, error } = await rpc<AccountDeletionRequest[]>("request_my_account_deletion");
  if (error) throw error;
  return first(data, "No se pudo registrar la solicitud de eliminación.");
}

export async function cancelAccountDeletion(): Promise<AccountDeletionRequest | null> {
  const { data, error } = await rpc<AccountDeletionRequest[]>("cancel_my_account_deletion");
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function exportMyBonoaData(): Promise<Record<string, unknown>> {
  const { data, error } = await rpc<Record<string, unknown>>("export_my_bonoa_data");
  if (error) throw error;
  if (!data) throw new Error("No se pudo generar la exportación.");
  return data;
}

export function downloadJsonFile(data: Record<string, unknown>, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
