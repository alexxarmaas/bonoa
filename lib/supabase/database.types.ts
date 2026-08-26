export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      business_audit_events: {
        Row: {
          actor_id: string | null
          business_id: string
          created_at: string
          event_type: string
          id: string
          metadata: Json
          pass_id: string | null
          product_id: string | null
        }
        Insert: {
          actor_id?: string | null
          business_id: string
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          pass_id?: string | null
          product_id?: string | null
        }
        Update: {
          actor_id?: string | null
          business_id?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          pass_id?: string | null
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_audit_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_audit_events_pass_id_fkey"
            columns: ["pass_id"]
            isOneToOne: false
            referencedRelation: "passes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_audit_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "loyalty_products"
            referencedColumns: ["id"]
          },
        ]
      }
      business_members: {
        Row: {
          business_id: string
          created_at: string
          role: Database["public"]["Enums"]["business_role"]
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          role?: Database["public"]["Enums"]["business_role"]
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          role?: Database["public"]["Enums"]["business_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          accent_color: string
          address: string | null
          created_at: string
          description: string | null
          id: string
          instagram_url: string | null
          logo_url: string | null
          name: string
          phone: string | null
          slug: string
          status: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          accent_color?: string
          address?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          slug: string
          status?: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          accent_color?: string
          address?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          slug?: string
          status?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      external_identities: {
        Row: {
          created_at: string
          email_snapshot: string | null
          external_user_id: string
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_snapshot?: string | null
          external_user_id: string
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_snapshot?: string | null
          external_user_id?: string
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loyalty_products: {
        Row: {
          active: boolean
          business_id: string
          created_at: string
          currency: string
          description: string | null
          id: string
          initial_units: number
          name: string
          sale_price_cents: number | null
          type: Database["public"]["Enums"]["loyalty_product_type"]
          updated_at: string
          validity_days: number | null
        }
        Insert: {
          active?: boolean
          business_id: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          initial_units: number
          name: string
          sale_price_cents?: number | null
          type?: Database["public"]["Enums"]["loyalty_product_type"]
          updated_at?: string
          validity_days?: number | null
        }
        Update: {
          active?: boolean
          business_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          initial_units?: number
          name?: string
          sale_price_cents?: number | null
          type?: Database["public"]["Enums"]["loyalty_product_type"]
          updated_at?: string
          validity_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      passes: {
        Row: {
          business_id: string
          created_at: string
          expires_at: string | null
          id: string
          initial_units: number
          issued_currency: string | null
          issued_price_cents: number | null
          loyalty_product_id: string
          purchased_at: string
          remaining_units: number
          status: Database["public"]["Enums"]["pass_status"]
          updated_at: string
          wallet_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          initial_units: number
          issued_currency?: string | null
          issued_price_cents?: number | null
          loyalty_product_id: string
          purchased_at?: string
          remaining_units: number
          status?: Database["public"]["Enums"]["pass_status"]
          updated_at?: string
          wallet_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          initial_units?: number
          issued_currency?: string | null
          issued_price_cents?: number | null
          loyalty_product_id?: string
          purchased_at?: string
          remaining_units?: number
          status?: Database["public"]["Enums"]["pass_status"]
          updated_at?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "passes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passes_loyalty_product_id_fkey"
            columns: ["loyalty_product_id"]
            isOneToOne: false
            referencedRelation: "loyalty_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passes_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      redemptions: {
        Row: {
          business_id: string
          created_at: string
          id: string
          idempotency_key: string
          pass_id: string
          performed_by: string
          units: number
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          idempotency_key: string
          pass_id: string
          performed_by: string
          units: number
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          idempotency_key?: string
          pass_id?: string
          performed_by?: string
          units?: number
        }
        Relationships: [
          {
            foreignKeyName: "redemptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemptions_pass_id_fkey"
            columns: ["pass_id"]
            isOneToOne: false
            referencedRelation: "passes"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          created_at: string
          id: string
          public_token: string
          qr_version: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          public_token?: string
          qr_version?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          public_token?: string
          qr_version?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_business_member: {
        Args: {
          member_email: string
          member_role?: Database["public"]["Enums"]["business_role"]
          target_business_id: string
        }
        Returns: {
          business_id: string
          created_at: string
          role: Database["public"]["Enums"]["business_role"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "business_members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      business_audit_feed: {
        Args: {
          page_limit: number
          page_offset: number
          target_business_id: string
        }
        Returns: {
          actor_email: string
          actor_id: string
          actor_name: string
          created_at: string
          event_id: string
          event_type: string
          metadata: Json
          pass_id: string
          product_id: string
        }[]
      }
      business_commercial_metrics: {
        Args: { target_business_id: string }
        Returns: {
          active_wallets: number
          average_consumed_percent: number
          average_issued_price_cents: number
          issued_value_30d_cents: number
          issued_value_total_cents: number
          passes_30d: number
          priced_passes: number
          wallets_30d: number
        }[]
      }
      business_dashboard_metrics: {
        Args: { target_business_id: string }
        Returns: {
          active_passes: number
          cancelled_passes: number
          exhausted_passes: number
          expired_passes: number
          expiring_30d: number
          issued_30d: number
          redemptions_7d: number
          redemptions_today: number
          redemptions_total: number
          total_passes: number
          unique_wallets: number
          units_redeemed_30d: number
        }[]
      }
      business_members_for_management: {
        Args: { target_business_id: string }
        Returns: {
          display_name: string
          email: string
          joined_at: string
          role: Database["public"]["Enums"]["business_role"]
          user_id: string
        }[]
      }
      business_passes_for_management: {
        Args: {
          page_limit: number
          page_offset: number
          product_filter: string
          search_query: string
          status_filter: Database["public"]["Enums"]["pass_status"]
          target_business_id: string
        }
        Returns: {
          expires_at: string
          initial_units: number
          pass_id: string
          pass_status: Database["public"]["Enums"]["pass_status"]
          product_id: string
          product_name: string
          product_type: Database["public"]["Enums"]["loyalty_product_type"]
          purchased_at: string
          remaining_units: number
          updated_at: string
        }[]
      }
      business_product_metrics: {
        Args: { target_business_id: string }
        Returns: {
          active: boolean
          active_passes: number
          passes_issued: number
          product_id: string
          product_name: string
          product_type: Database["public"]["Enums"]["loyalty_product_type"]
          redemptions: number
          units_redeemed: number
        }[]
      }
      business_wallet_passes: {
        Args: {
          target_business_id: string
          target_qr_version: number
          target_wallet_token: string
        }
        Returns: {
          expires_at: string
          initial_units: number
          pass_id: string
          pass_status: Database["public"]["Enums"]["pass_status"]
          product_id: string
          product_name: string
          product_type: Database["public"]["Enums"]["loyalty_product_type"]
          remaining_units: number
        }[]
      }
      cancel_pass: {
        Args: { target_pass_id: string }
        Returns: {
          business_id: string
          created_at: string
          expires_at: string | null
          id: string
          initial_units: number
          issued_currency: string | null
          issued_price_cents: number | null
          loyalty_product_id: string
          purchased_at: string
          remaining_units: number
          status: Database["public"]["Enums"]["pass_status"]
          updated_at: string
          wallet_id: string
        }
        SetofOptions: {
          from: "*"
          to: "passes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_business: {
        Args: { business_name: string; business_slug: string }
        Returns: {
          accent_color: string
          address: string | null
          created_at: string
          description: string | null
          id: string
          instagram_url: string | null
          logo_url: string | null
          name: string
          phone: string | null
          slug: string
          status: string
          updated_at: string
          website_url: string | null
        }
        SetofOptions: {
          from: "*"
          to: "businesses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      issue_pass: {
        Args: {
          target_product_id: string
          target_qr_version: number
          target_wallet_token: string
        }
        Returns: {
          business_id: string
          created_at: string
          expires_at: string | null
          id: string
          initial_units: number
          issued_currency: string | null
          issued_price_cents: number | null
          loyalty_product_id: string
          purchased_at: string
          remaining_units: number
          status: Database["public"]["Enums"]["pass_status"]
          updated_at: string
          wallet_id: string
        }
        SetofOptions: {
          from: "*"
          to: "passes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      redeem_pass: {
        Args: {
          request_id: string
          target_pass_id: string
          units_to_redeem: number
        }
        Returns: {
          business_id: string
          created_at: string
          id: string
          idempotency_key: string
          pass_id: string
          performed_by: string
          units: number
        }
        SetofOptions: {
          from: "*"
          to: "redemptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      remove_business_member: {
        Args: { target_business_id: string; target_user_id: string }
        Returns: boolean
      }
      rotate_wallet_qr: {
        Args: never
        Returns: {
          created_at: string
          id: string
          public_token: string
          qr_version: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wallets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_business_member_role: {
        Args: {
          new_role: Database["public"]["Enums"]["business_role"]
          target_business_id: string
          target_user_id: string
        }
        Returns: {
          business_id: string
          created_at: string
          role: Database["public"]["Enums"]["business_role"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "business_members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      business_role: "owner" | "manager" | "staff"
      loyalty_product_type: "uses" | "balance"
      pass_status: "active" | "exhausted" | "expired" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends { Row: infer R }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends { Row: infer R }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Insert: infer I }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Insert: infer I }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Update: infer U }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Update: infer U }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      business_role: ["owner", "manager", "staff"],
      loyalty_product_type: ["uses", "balance"],
      pass_status: ["active", "exhausted", "expired", "cancelled"],
    },
  },
} as const
