import { supabase } from "@/lib/supabase/client";
import type { BonoaQrIdentity } from "@/lib/business-data";

type RpcError = { message: string };
type RpcResponse<T> = PromiseLike<{ data: T | null; error: RpcError | null }>;
type ClubRpc = <T>(name: string, args?: Record<string, unknown>) => RpcResponse<T>;
const rpc = supabase.rpc as unknown as ClubRpc;

export type ClubJoinRequest = {
  request_id: string;
  business_name: string;
  club_name: string;
  business_logo_url: string | null;
  business_accent_color: string | null;
  expires_at: string;
};

export type ClubJoinScanStatus = "already_member" | "pending" | "declined";

export async function requestClubJoinByQr(businessId: string, qr: BonoaQrIdentity): Promise<ClubJoinScanStatus> {
  const { data, error } = await rpc<ClubJoinScanStatus>("request_club_join_by_qr", {
    target_business_id: businessId,
    target_wallet_token: qr.token,
    target_qr_version: qr.version,
  });
  if (error) throw error;
  if (!data || !["already_member", "pending", "declined"].includes(data)) {
    throw new Error("No se pudo comprobar la solicitud de alta.");
  }
  return data;
}

export async function getPendingClubJoins(): Promise<ClubJoinRequest[]> {
  const { data, error } = await rpc<ClubJoinRequest[]>("wallet_pending_club_joins");
  if (error) throw error;
  return data ?? [];
}

export async function respondClubJoin(requestId: string, accept: boolean): Promise<"approved" | "declined" | "expired"> {
  const { data, error } = await rpc<"approved" | "declined" | "expired">("respond_club_join_request", {
    target_request_id: requestId,
    accept_request: accept,
  });
  if (error) throw error;
  if (!data || !["approved", "declined", "expired"].includes(data)) {
    throw new Error("No se pudo responder a la solicitud.");
  }
  return data;
}
