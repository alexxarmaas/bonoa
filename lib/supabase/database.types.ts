export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string | null; email: string | null; avatar_url: string | null; created_at: string; updated_at: string };
        Insert: { id: string; display_name?: string | null; email?: string | null; avatar_url?: string | null; created_at?: string; updated_at?: string };
        Update: { display_name?: string | null; email?: string | null; avatar_url?: string | null; updated_at?: string };
      };
      businesses: {
        Row: { id: string; name: string; slug: string; logo_url: string | null; status: string; created_at: string; updated_at: string };
        Insert: { id?: string; name: string; slug: string; logo_url?: string | null; status?: string; created_at?: string; updated_at?: string };
        Update: { name?: string; slug?: string; logo_url?: string | null; status?: string; updated_at?: string };
      };
      business_members: {
        Row: { business_id: string; user_id: string; role: "owner" | "manager" | "staff"; created_at: string };
        Insert: { business_id: string; user_id: string; role?: "owner" | "manager" | "staff"; created_at?: string };
        Update: { role?: "owner" | "manager" | "staff" };
      };
      loyalty_products: {
        Row: { id: string; business_id: string; name: string; description: string | null; type: "uses" | "balance"; initial_units: number; validity_days: number | null; active: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; business_id: string; name: string; description?: string | null; type?: "uses" | "balance"; initial_units: number; validity_days?: number | null; active?: boolean; created_at?: string; updated_at?: string };
        Update: { name?: string; description?: string | null; type?: "uses" | "balance"; initial_units?: number; validity_days?: number | null; active?: boolean; updated_at?: string };
      };
      wallets: {
        Row: { id: string; user_id: string; public_token: string; qr_version: number; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; public_token?: string; qr_version?: number; created_at?: string; updated_at?: string };
        Update: { public_token?: string; qr_version?: number; updated_at?: string };
      };
      passes: {
        Row: { id: string; wallet_id: string; loyalty_product_id: string; business_id: string; status: "active" | "exhausted" | "expired" | "cancelled"; initial_units: number; remaining_units: number; purchased_at: string; expires_at: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; wallet_id: string; loyalty_product_id: string; business_id: string; status?: "active" | "exhausted" | "expired" | "cancelled"; initial_units: number; remaining_units: number; purchased_at?: string; expires_at?: string | null; created_at?: string; updated_at?: string };
        Update: { status?: "active" | "exhausted" | "expired" | "cancelled"; remaining_units?: number; expires_at?: string | null; updated_at?: string };
      };
      redemptions: {
        Row: { id: string; pass_id: string; business_id: string; units: number; performed_by: string; idempotency_key: string; created_at: string };
        Insert: { id?: string; pass_id: string; business_id: string; units: number; performed_by: string; idempotency_key: string; created_at?: string };
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: {
      redeem_pass: {
        Args: { target_pass_id: string; units_to_redeem: number; request_id: string };
        Returns: { id: string; pass_id: string; business_id: string; units: number; performed_by: string; idempotency_key: string; created_at: string };
      };
    };
    Enums: {
      business_role: "owner" | "manager" | "staff";
      loyalty_product_type: "uses" | "balance";
      pass_status: "active" | "exhausted" | "expired" | "cancelled";
    };
    CompositeTypes: Record<string, never>;
  };
};
