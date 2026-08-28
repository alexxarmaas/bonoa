export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.17" }
  public: {
    Tables: {
      account_deletion_requests: {
        Row: { cancelled_at: string | null; completed_at: string | null; id: string; requested_at: string; status: string; user_id: string | null }
        Insert: { cancelled_at?: string | null; completed_at?: string | null; id?: string; requested_at?: string; status?: string; user_id?: string | null }
        Update: { cancelled_at?: string | null; completed_at?: string | null; id?: string; requested_at?: string; status?: string; user_id?: string | null }
        Relationships: []
      }
      business_audit_events: {
        Row: { actor_id: string | null; business_id: string; created_at: string; event_type: string; id: string; metadata: Json; pass_id: string | null; product_id: string | null }
        Insert: { actor_id?: string | null; business_id: string; created_at?: string; event_type: string; id?: string; metadata?: Json; pass_id?: string | null; product_id?: string | null }
        Update: { actor_id?: string | null; business_id?: string; created_at?: string; event_type?: string; id?: string; metadata?: Json; pass_id?: string | null; product_id?: string | null }
        Relationships: []
      }
      business_fraud_settings: {
        Row: { business_id: string; enabled: boolean; max_events_per_wallet_hour: number; min_event_interval_seconds: number; updated_at: string }
        Insert: { business_id: string; enabled?: boolean; max_events_per_wallet_hour?: number; min_event_interval_seconds?: number; updated_at?: string }
        Update: { business_id?: string; enabled?: boolean; max_events_per_wallet_hour?: number; min_event_interval_seconds?: number; updated_at?: string }
        Relationships: []
      }
      business_members: {
        Row: { business_id: string; created_at: string; role: Database["public"]["Enums"]["business_role"]; user_id: string }
        Insert: { business_id: string; created_at?: string; role?: Database["public"]["Enums"]["business_role"]; user_id: string }
        Update: { business_id?: string; created_at?: string; role?: Database["public"]["Enums"]["business_role"]; user_id?: string }
        Relationships: []
      }
      business_referral_programs: {
        Row: { active: boolean; business_id: string; created_at: string; headline: string; minimum_purchase_cents: number; referred_reward_product_id: string | null; referrer_reward_product_id: string; updated_at: string }
        Insert: { active?: boolean; business_id: string; created_at?: string; headline?: string; minimum_purchase_cents?: number; referred_reward_product_id?: string | null; referrer_reward_product_id: string; updated_at?: string }
        Update: { active?: boolean; business_id?: string; created_at?: string; headline?: string; minimum_purchase_cents?: number; referred_reward_product_id?: string | null; referrer_reward_product_id?: string; updated_at?: string }
        Relationships: []
      }
      business_risk_events: {
        Row: { actor_id: string | null; business_id: string; created_at: string; id: string; metadata: Json; risk_type: string; wallet_id: string | null }
        Insert: { actor_id?: string | null; business_id: string; created_at?: string; id?: string; metadata?: Json; risk_type: string; wallet_id?: string | null }
        Update: { actor_id?: string | null; business_id?: string; created_at?: string; id?: string; metadata?: Json; risk_type?: string; wallet_id?: string | null }
        Relationships: []
      }
      businesses: {
        Row: {
          accent_color: string; address: string | null; club_message: string | null; club_name: string | null; created_at: string; description: string | null; directory_category: string | null; directory_latitude: number | null; directory_listed: boolean; directory_longitude: number | null; id: string; instagram_url: string | null; logo_url: string | null; membership_badge_label: string; name: string; onboarding_completed_at: string | null; phone: string | null; slug: string; status: string; updated_at: string; website_url: string | null
        }
        Insert: {
          accent_color?: string; address?: string | null; club_message?: string | null; club_name?: string | null; created_at?: string; description?: string | null; directory_category?: string | null; directory_latitude?: number | null; directory_listed?: boolean; directory_longitude?: number | null; id?: string; instagram_url?: string | null; logo_url?: string | null; membership_badge_label?: string; name: string; onboarding_completed_at?: string | null; phone?: string | null; slug: string; status?: string; updated_at?: string; website_url?: string | null
        }
        Update: {
          accent_color?: string; address?: string | null; club_message?: string | null; club_name?: string | null; created_at?: string; description?: string | null; directory_category?: string | null; directory_latitude?: number | null; directory_listed?: boolean; directory_longitude?: number | null; id?: string; instagram_url?: string | null; logo_url?: string | null; membership_badge_label?: string; name?: string; onboarding_completed_at?: string | null; phone?: string | null; slug?: string; status?: string; updated_at?: string; website_url?: string | null
        }
        Relationships: []
      }
      loyalty_automation_grants: {
        Row: { created_at: string; id: string; milestone: number; pass_id: string | null; rule_id: string; wallet_id: string }
        Insert: { created_at?: string; id?: string; milestone: number; pass_id?: string | null; rule_id: string; wallet_id: string }
        Update: { created_at?: string; id?: string; milestone?: number; pass_id?: string | null; rule_id?: string; wallet_id?: string }
        Relationships: []
      }
      loyalty_automation_rules: {
        Row: { active: boolean; business_id: string; created_at: string; created_by: string | null; id: string; max_rewards_per_wallet: number | null; minimum_purchase_cents: number; name: string; repeatable: boolean; reward_product_id: string; threshold_value: number; trigger_product_id: string | null; trigger_type: string; updated_at: string }
        Insert: { active?: boolean; business_id: string; created_at?: string; created_by?: string | null; id?: string; max_rewards_per_wallet?: number | null; minimum_purchase_cents?: number; name: string; repeatable?: boolean; reward_product_id: string; threshold_value: number; trigger_product_id?: string | null; trigger_type: string; updated_at?: string }
        Update: { active?: boolean; business_id?: string; created_at?: string; created_by?: string | null; id?: string; max_rewards_per_wallet?: number | null; minimum_purchase_cents?: number; name?: string; repeatable?: boolean; reward_product_id?: string; threshold_value?: number; trigger_product_id?: string | null; trigger_type?: string; updated_at?: string }
        Relationships: []
      }
      loyalty_campaign_claims: {
        Row: { campaign_id: string; claimed_at: string; id: string; pass_id: string; wallet_id: string }
        Insert: { campaign_id: string; claimed_at?: string; id?: string; pass_id: string; wallet_id: string }
        Update: { campaign_id?: string; claimed_at?: string; id?: string; pass_id?: string; wallet_id?: string }
        Relationships: []
      }
      loyalty_campaigns: {
        Row: { active: boolean; business_id: string; created_at: string; created_by: string | null; ends_at: string | null; id: string; max_claims: number | null; message: string | null; name: string; product_id: string; share_code: string; starts_at: string; target_segment: string; updated_at: string }
        Insert: { active?: boolean; business_id: string; created_at?: string; created_by?: string | null; ends_at?: string | null; id?: string; max_claims?: number | null; message?: string | null; name: string; product_id: string; share_code: string; starts_at?: string; target_segment?: string; updated_at?: string }
        Update: { active?: boolean; business_id?: string; created_at?: string; created_by?: string | null; ends_at?: string | null; id?: string; max_claims?: number | null; message?: string | null; name?: string; product_id?: string; share_code?: string; starts_at?: string; target_segment?: string; updated_at?: string }
        Relationships: []
      }
      loyalty_events: {
        Row: { amount_cents: number; business_id: string; created_at: string; event_type: string; id: string; idempotency_key: string; occurred_at: string; product_id: string | null; recorded_by: string | null; rewards_issued: number; source_redemption_id: string | null; wallet_id: string }
        Insert: { amount_cents?: number; business_id: string; created_at?: string; event_type: string; id?: string; idempotency_key: string; occurred_at?: string; product_id?: string | null; recorded_by?: string | null; rewards_issued?: number; source_redemption_id?: string | null; wallet_id: string }
        Update: { amount_cents?: number; business_id?: string; created_at?: string; event_type?: string; id?: string; idempotency_key?: string; occurred_at?: string; product_id?: string | null; recorded_by?: string | null; rewards_issued?: number; source_redemption_id?: string | null; wallet_id?: string }
        Relationships: []
      }
      loyalty_memberships: {
        Row: { business_id: string; created_at: string; id: string; joined_at: string; last_activity_at: string; status: string; updated_at: string; wallet_id: string }
        Insert: { business_id: string; created_at?: string; id?: string; joined_at?: string; last_activity_at?: string; status?: string; updated_at?: string; wallet_id: string }
        Update: { business_id?: string; created_at?: string; id?: string; joined_at?: string; last_activity_at?: string; status?: string; updated_at?: string; wallet_id?: string }
        Relationships: []
      }
      loyalty_products: {
        Row: { active: boolean; business_id: string; created_at: string; currency: string; description: string | null; id: string; initial_units: number; name: string; publicly_listed: boolean; sale_price_cents: number | null; type: Database["public"]["Enums"]["loyalty_product_type"]; updated_at: string; validity_days: number | null }
        Insert: { active?: boolean; business_id: string; created_at?: string; currency?: string; description?: string | null; id?: string; initial_units: number; name: string; publicly_listed?: boolean; sale_price_cents?: number | null; type?: Database["public"]["Enums"]["loyalty_product_type"]; updated_at?: string; validity_days?: number | null }
        Update: { active?: boolean; business_id?: string; created_at?: string; currency?: string; description?: string | null; id?: string; initial_units?: number; name?: string; publicly_listed?: boolean; sale_price_cents?: number | null; type?: Database["public"]["Enums"]["loyalty_product_type"]; updated_at?: string; validity_days?: number | null }
        Relationships: []
      }
      passes: {
        Row: { business_id: string; created_at: string; expires_at: string | null; id: string; initial_units: number; issuance_key: string | null; issued_currency: string | null; issued_price_cents: number | null; loyalty_product_id: string; purchased_at: string; remaining_units: number; status: Database["public"]["Enums"]["pass_status"]; updated_at: string; wallet_id: string }
        Insert: { business_id: string; created_at?: string; expires_at?: string | null; id?: string; initial_units: number; issuance_key?: string | null; issued_currency?: string | null; issued_price_cents?: number | null; loyalty_product_id: string; purchased_at?: string; remaining_units: number; status?: Database["public"]["Enums"]["pass_status"]; updated_at?: string; wallet_id: string }
        Update: { business_id?: string; created_at?: string; expires_at?: string | null; id?: string; initial_units?: number; issuance_key?: string | null; issued_currency?: string | null; issued_price_cents?: number | null; loyalty_product_id?: string; purchased_at?: string; remaining_units?: number; status?: Database["public"]["Enums"]["pass_status"]; updated_at?: string; wallet_id?: string }
        Relationships: []
      }
      profiles: {
        Row: { avatar_url: string | null; created_at: string; display_name: string | null; email: string | null; id: string; updated_at: string }
        Insert: { avatar_url?: string | null; created_at?: string; display_name?: string | null; email?: string | null; id: string; updated_at?: string }
        Update: { avatar_url?: string | null; created_at?: string; display_name?: string | null; email?: string | null; id?: string; updated_at?: string }
        Relationships: []
      }
      redemptions: {
        Row: { business_id: string; created_at: string; id: string; idempotency_key: string; pass_id: string | null; performed_by: string | null; units: number }
        Insert: { business_id: string; created_at?: string; id?: string; idempotency_key: string; pass_id?: string | null; performed_by?: string | null; units: number }
        Update: { business_id?: string; created_at?: string; id?: string; idempotency_key?: string; pass_id?: string | null; performed_by?: string | null; units?: number }
        Relationships: []
      }
      referral_claims: {
        Row: { business_id: string; claimed_at: string; first_purchase_event_id: string | null; id: string; invite_id: string; referred_reward_pass_id: string | null; referred_wallet_id: string; referrer_reward_pass_id: string | null; referrer_wallet_id: string; rewarded_at: string | null; status: string }
        Insert: { business_id: string; claimed_at?: string; first_purchase_event_id?: string | null; id?: string; invite_id: string; referred_reward_pass_id?: string | null; referred_wallet_id: string; referrer_reward_pass_id?: string | null; referrer_wallet_id: string; rewarded_at?: string | null; status?: string }
        Update: { business_id?: string; claimed_at?: string; first_purchase_event_id?: string | null; id?: string; invite_id?: string; referred_reward_pass_id?: string | null; referred_wallet_id?: string; referrer_reward_pass_id?: string | null; referrer_wallet_id?: string; rewarded_at?: string | null; status?: string }
        Relationships: []
      }
      referral_invites: {
        Row: { active: boolean; business_id: string; code: string; created_at: string; id: string; referrer_wallet_id: string }
        Insert: { active?: boolean; business_id: string; code: string; created_at?: string; id?: string; referrer_wallet_id: string }
        Update: { active?: boolean; business_id?: string; code?: string; created_at?: string; id?: string; referrer_wallet_id?: string }
        Relationships: []
      }
      user_privacy_preferences: {
        Row: { marketing_emails: boolean; product_updates: boolean; updated_at: string; user_id: string }
        Insert: { marketing_emails?: boolean; product_updates?: boolean; updated_at?: string; user_id: string }
        Update: { marketing_emails?: boolean; product_updates?: boolean; updated_at?: string; user_id?: string }
        Relationships: []
      }
      wallet_notifications: {
        Row: { body: string; business_id: string | null; created_at: string; dedupe_key: string | null; id: string; metadata: Json; notification_type: string; read_at: string | null; title: string; wallet_id: string }
        Insert: { body: string; business_id?: string | null; created_at?: string; dedupe_key?: string | null; id?: string; metadata?: Json; notification_type: string; read_at?: string | null; title: string; wallet_id: string }
        Update: { body?: string; business_id?: string | null; created_at?: string; dedupe_key?: string | null; id?: string; metadata?: Json; notification_type?: string; read_at?: string | null; title?: string; wallet_id?: string }
        Relationships: []
      }
      wallets: {
        Row: { created_at: string; id: string; public_token: string; qr_version: number; updated_at: string; user_id: string }
        Insert: { created_at?: string; id?: string; public_token?: string; qr_version?: number; updated_at?: string; user_id: string }
        Update: { created_at?: string; id?: string; public_token?: string; qr_version?: number; updated_at?: string; user_id?: string }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      add_business_member: { Args: { member_email: string; member_role?: Database["public"]["Enums"]["business_role"]; target_business_id: string }; Returns: Database["public"]["Tables"]["business_members"]["Row"] }
      admin_businesses: { Args: never; Returns: { business_id: string; business_name: string; business_slug: string; business_status: string; created_at: string; customers: number; directory_category: string; directory_listed: boolean; loyalty_events: number; members: number; onboarding_completed_at: string; passes: number }[] }
      admin_overview: { Args: never; Returns: { businesses_active: number; businesses_listed: number; businesses_total: number; loyalty_events_total: number; memberships_total: number; passes_total: number; risk_events_30d: number; users_total: number; wallets_total: number }[] }
      admin_set_business_status: { Args: { next_status: string; target_business_id: string }; Returns: string }
      admin_users: { Args: never; Returns: { businesses: number; created_at: string; display_name: string; email: string; memberships: number; passes: number; user_id: string }[] }
      business_audit_feed: { Args: { page_limit: number; page_offset: number; target_business_id: string }; Returns: { actor_email: string; actor_id: string; actor_name: string; created_at: string; event_id: string; event_type: string; metadata: Json; pass_id: string; product_id: string }[] }
      business_campaign_performance: { Args: { target_business_id: string }; Returns: { campaign_id: string; claims: number; converted_customers: number; identified_revenue_cents: number }[] }
      business_commercial_metrics: { Args: { target_business_id: string }; Returns: { active_wallets: number; average_consumed_percent: number; average_issued_price_cents: number; issued_value_30d_cents: number; issued_value_total_cents: number; passes_30d: number; priced_passes: number; wallets_30d: number }[] }
      business_customer_detail: { Args: { target_business_id: string; target_wallet_id: string }; Returns: Json }
      business_customer_loyalty_snapshot: { Args: { target_business_id: string }; Returns: { active_passes: number; customer_code: string; days_since_activity: number; first_seen: string; issued_value_cents: number; last_activity: string; passes_issued: number; purchases: number; redemptions: number; rewards_earned: number; segment: string; spend_cents: number; visits: number; wallet_id: string }[] }
      business_customer_segments: { Args: { target_business_id: string }; Returns: { active_passes: number; customer_code: string; days_since_activity: number; first_seen: string; issued_value_cents: number; last_activity: string; passes_issued: number; redemptions: number; segment: string; wallet_id: string }[] }
      business_customer_timeline: { Args: { target_business_id: string; target_limit?: number; target_wallet_id: string }; Returns: { amount_cents: number; detail: string; event_id: string; event_type: string; occurred_at: string; reference_code: string; title: string; units: number }[] }
      business_dashboard_metrics: { Args: { target_business_id: string }; Returns: { active_passes: number; cancelled_passes: number; exhausted_passes: number; expired_passes: number; expiring_30d: number; issued_30d: number; redemptions_7d: number; redemptions_today: number; redemptions_total: number; total_passes: number; unique_wallets: number; units_redeemed_30d: number }[] }
      business_loyalty_automation_rules: { Args: { target_business_id: string }; Returns: { active: boolean; created_at: string; customers_rewarded: number; max_rewards_per_wallet: number; repeatable: boolean; reward_product_id: string; reward_product_name: string; rewards_issued: number; rule_id: string; rule_name: string; threshold_value: number; trigger_product_id: string; trigger_product_name: string; trigger_type: string }[] }
      business_loyalty_automation_rules_v2: { Args: { target_business_id: string }; Returns: { active: boolean; created_at: string; customers_rewarded: number; max_rewards_per_wallet: number; minimum_purchase_cents: number; repeatable: boolean; reward_product_id: string; reward_product_name: string; rewards_issued: number; rule_id: string; rule_name: string; threshold_value: number; trigger_product_id: string; trigger_product_name: string; trigger_type: string }[] }
      business_loyalty_campaigns: { Args: { target_business_id: string }; Returns: { active: boolean; campaign_id: string; campaign_name: string; claims: number; created_at: string; ends_at: string; max_claims: number; message: string; product_id: string; product_name: string; share_code: string; starts_at: string; state: string }[] }
      business_loyalty_campaigns_v2: { Args: { target_business_id: string }; Returns: { active: boolean; campaign_id: string; campaign_name: string; claims: number; created_at: string; ends_at: string; max_claims: number; message: string; product_id: string; product_name: string; share_code: string; starts_at: string; state: string; target_segment: string }[] }
      business_loyalty_event_summary: { Args: { target_business_id: string }; Returns: { purchases_30d: number; rewards_30d: number; spend_30d_cents: number; visits_30d: number }[] }
      business_loyalty_opportunities: { Args: { target_business_id: string }; Returns: { at_risk_customers: number; loyal_customers: number; members_total: number; near_reward_customers: number; new_7d: number; purchases_30d: number; recurrent_customers: number; rewards_30d: number; spend_30d_cents: number }[] }
      business_members_for_management: { Args: { target_business_id: string }; Returns: { display_name: string; email: string; joined_at: string; role: Database["public"]["Enums"]["business_role"]; user_id: string }[] }
      business_passes_for_management: { Args: { page_limit: number; page_offset: number; product_filter: string; search_query: string; status_filter: Database["public"]["Enums"]["pass_status"]; target_business_id: string }; Returns: { expires_at: string; initial_units: number; pass_id: string; pass_status: Database["public"]["Enums"]["pass_status"]; product_id: string; product_name: string; product_type: Database["public"]["Enums"]["loyalty_product_type"]; purchased_at: string; remaining_units: number; updated_at: string }[] }
      business_product_metrics: { Args: { target_business_id: string }; Returns: { active: boolean; active_passes: number; passes_issued: number; product_id: string; product_name: string; product_type: Database["public"]["Enums"]["loyalty_product_type"]; redemptions: number; units_redeemed: number }[] }
      business_referral_program: { Args: { target_business_id: string }; Returns: Json }
      business_referral_stats: { Args: { target_business_id: string }; Returns: Json }
      business_risk_events_feed: { Args: { target_business_id: string; target_limit?: number }; Returns: { actor_id: string; created_at: string; customer_code: string; metadata: Json; risk_id: string; risk_type: string }[] }
      business_wallet_passes: { Args: { target_business_id: string; target_qr_version: number; target_wallet_token: string }; Returns: { expires_at: string; initial_units: number; pass_id: string; pass_status: Database["public"]["Enums"]["pass_status"]; product_id: string; product_name: string; product_type: Database["public"]["Enums"]["loyalty_product_type"]; remaining_units: number }[] }
      business_wallet_snapshot: { Args: { target_business_id: string; target_qr_version: number; target_wallet_token: string }; Returns: Json }
      cancel_my_account_deletion: { Args: never; Returns: { cancelled_at: string; completed_at: string; request_id: string; requested_at: string; status: string }[] }
      cancel_pass: { Args: { target_pass_id: string }; Returns: Database["public"]["Tables"]["passes"]["Row"] }
      claim_loyalty_campaign: { Args: { campaign_code: string }; Returns: { already_claimed: boolean; expires_at: string; initial_units: number; pass_id: string; product_name: string }[] }
      claim_referral: { Args: { referral_code: string }; Returns: Json }
      create_business: { Args: { business_name: string; business_slug: string }; Returns: Database["public"]["Tables"]["businesses"]["Row"] }
      create_loyalty_automation_rule: { Args: { reward_limit: number; rule_name: string; rule_repeatable: boolean; rule_threshold_value: number; rule_trigger_type: string; target_business_id: string; target_reward_product_id: string; target_trigger_product_id: string }; Returns: Database["public"]["Tables"]["loyalty_automation_rules"]["Row"] }
      create_loyalty_automation_rule_v2: { Args: { reward_limit: number; rule_minimum_purchase_cents: number; rule_name: string; rule_repeatable: boolean; rule_threshold_value: number; rule_trigger_type: string; target_business_id: string; target_reward_product_id: string; target_trigger_product_id: string }; Returns: Database["public"]["Tables"]["loyalty_automation_rules"]["Row"] }
      create_loyalty_campaign: { Args: { campaign_ends_at: string; campaign_max_claims: number; campaign_message: string; campaign_name: string; campaign_starts_at: string; target_business_id: string; target_product_id: string }; Returns: Database["public"]["Tables"]["loyalty_campaigns"]["Row"] }
      create_loyalty_campaign_v2: { Args: { campaign_ends_at: string; campaign_max_claims: number; campaign_message: string; campaign_name: string; campaign_starts_at: string; campaign_target_segment: string; target_business_id: string; target_product_id: string }; Returns: Database["public"]["Tables"]["loyalty_campaigns"]["Row"] }
      export_my_bonoa_data: { Args: never; Returns: Json }
      get_business_fraud_settings: { Args: { target_business_id: string }; Returns: Json }
      is_platform_admin: { Args: never; Returns: boolean }
      issue_pass: { Args: { target_product_id: string; target_qr_version: number; target_wallet_token: string }; Returns: Database["public"]["Tables"]["passes"]["Row"] }
      issue_pass_idempotent: { Args: { request_id: string; target_product_id: string; target_qr_version: number; target_wallet_token: string }; Returns: Database["public"]["Tables"]["passes"]["Row"] }
      join_public_business: { Args: { target_business_slug: string }; Returns: string }
      mark_all_wallet_notifications_read: { Args: never; Returns: number }
      mark_wallet_notification_read: { Args: { target_notification_id: string }; Returns: boolean }
      my_account_deletion_request: { Args: never; Returns: { cancelled_at: string; completed_at: string; request_id: string; requested_at: string; status: string }[] }
      my_privacy_preferences: { Args: never; Returns: { marketing_emails: boolean; product_updates: boolean; updated_at: string }[] }
      public_business_loyalty_program: { Args: { target_slug: string }; Returns: { business_accent_color: string; business_id: string; business_logo_url: string; business_name: string; business_slug: string; club_message: string; club_name: string; membership_badge_label: string; minimum_purchase_cents: number; reward_product_name: string; rule_id: string; rule_name: string; threshold_value: number; trigger_type: string }[] }
      public_loyalty_campaign: { Args: { campaign_code: string }; Returns: { business_accent_color: string; business_logo_url: string; business_name: string; business_slug: string; campaign_id: string; campaign_message: string; campaign_name: string; claims_remaining: number; ends_at: string; initial_units: number; product_description: string; product_name: string; product_type: Database["public"]["Enums"]["loyalty_product_type"]; state: string; validity_days: number }[] }
      public_referral: { Args: { referral_code: string }; Returns: Json }
      redeem_pass: { Args: { request_id: string; target_pass_id: string; units_to_redeem: number }; Returns: Database["public"]["Tables"]["redemptions"]["Row"] }
      refresh_wallet_system_notifications: { Args: never; Returns: number }
      register_loyalty_event: { Args: { request_id: string; target_amount_cents: number; target_business_id: string; target_event_type: string; target_qr_version: number; target_wallet_token: string }; Returns: { already_recorded: boolean; amount_cents: number; event_id: string; event_type: string; rewards_issued: number }[] }
      remove_business_member: { Args: { target_business_id: string; target_user_id: string }; Returns: boolean }
      request_my_account_deletion: { Args: never; Returns: { cancelled_at: string; completed_at: string; request_id: string; requested_at: string; status: string }[] }
      rotate_wallet_qr: { Args: never; Returns: Database["public"]["Tables"]["wallets"]["Row"] }
      save_my_privacy_preferences: { Args: { next_marketing_emails: boolean; next_product_updates: boolean }; Returns: { marketing_emails: boolean; product_updates: boolean; updated_at: string }[] }
      set_business_member_role: { Args: { new_role: Database["public"]["Enums"]["business_role"]; target_business_id: string; target_user_id: string }; Returns: Database["public"]["Tables"]["business_members"]["Row"] }
      set_loyalty_automation_rule_active: { Args: { next_active: boolean; target_rule_id: string }; Returns: Database["public"]["Tables"]["loyalty_automation_rules"]["Row"] }
      set_loyalty_campaign_active: { Args: { next_active: boolean; target_campaign_id: string }; Returns: Database["public"]["Tables"]["loyalty_campaigns"]["Row"] }
      setup_loyalty_program_template: { Args: { reward_name: string; target_business_id: string; template_key: string }; Returns: Json }
      update_business_club_profile: { Args: { target_badge_label: string; target_business_id: string; target_club_message: string; target_club_name: string }; Returns: Json }
      update_business_fraud_settings: { Args: { target_business_id: string; target_enabled: boolean; target_max_hour: number; target_min_interval: number }; Returns: Json }
      upsert_business_referral_program: { Args: { target_active: boolean; target_business_id: string; target_headline: string; target_minimum_purchase_cents: number; target_referred_reward_product_id: string; target_referrer_reward_product_id: string }; Returns: Json }
      wallet_loyalty_progress: { Args: never; Returns: { business_accent_color: string; business_id: string; business_logo_url: string; business_name: string; completed: boolean; created_at: string; max_rewards_per_wallet: number; metric_value: number; progress_value: number; remaining_value: number; repeatable: boolean; reward_pending: boolean; reward_product_name: string; rewards_earned: number; rule_id: string; rule_name: string; threshold_value: number; trigger_product_name: string; trigger_type: string }[] }
      wallet_membership_rule_progress: { Args: never; Returns: { business_id: string; completed: boolean; created_at: string; max_rewards_per_wallet: number; metric_value: number; minimum_purchase_cents: number; progress_value: number; remaining_value: number; repeatable: boolean; reward_product_name: string; rewards_earned: number; rule_id: string; rule_name: string; threshold_value: number; trigger_product_name: string; trigger_type: string }[] }
      wallet_memberships: { Args: never; Returns: { business_accent_color: string; business_id: string; business_logo_url: string; business_name: string; club_message: string; club_name: string; joined_at: string; last_activity_at: string; membership_badge_label: string; membership_id: string; purchases: number; rewards_earned: number; segment: string; spend_cents: number; visits: number }[] }
      wallet_memberships_v2: { Args: never; Returns: { business_accent_color: string; business_id: string; business_logo_url: string; business_name: string; club_message: string; club_name: string; joined_at: string; last_activity_at: string; membership_badge_label: string; membership_id: string; purchases: number; rewards_earned: number; segment: string; spend_cents: number; visits: number }[] }
      wallet_notifications_feed: { Args: { target_limit?: number }; Returns: { body: string; business_id: string; business_name: string; created_at: string; metadata: Json; notification_id: string; notification_type: string; read_at: string; title: string }[] }
      wallet_referral_link: { Args: { target_business_id: string }; Returns: Json }
      wallet_transaction_history: { Args: { target_limit?: number }; Returns: { amount_cents: number; balance_after: number; balance_before: number; business_id: string; business_name: string; occurred_at: string; product_id: string; product_name: string; reference_code: string; transaction_id: string; transaction_type: string; units: number }[] }
    }
    Enums: {
      business_role: "owner" | "manager" | "staff"
      loyalty_product_type: "uses" | "balance"
      pass_status: "active" | "exhausted" | "expired" | "cancelled"
    }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"]
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T]

export const Constants = {
  public: {
    Enums: {
      business_role: ["owner", "manager", "staff"],
      loyalty_product_type: ["uses", "balance"],
      pass_status: ["active", "exhausted", "expired", "cancelled"],
    },
  },
} as const
