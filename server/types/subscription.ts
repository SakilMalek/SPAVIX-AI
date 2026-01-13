/**
 * Subscription and monetization type definitions
 */

export interface SubscriptionPlan {
  id: string;
  name: 'starter' | 'pro' | 'business';
  display_name: string;
  price: number;
  billing_cycle: 'monthly' | 'yearly';
  features: PlanFeatures;
  limits: PlanLimits;
  stripe_price_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface PlanFeatures {
  unlimited_transformations: boolean;
  premium_styles: boolean;
  high_resolution_exports: boolean;
  priority_generation: boolean;
  ai_design_advice: boolean;
  team_collaboration: boolean;
  api_access: boolean;
  custom_brand_styles: boolean;
  whitelabel_reports: boolean;
  dedicated_support: boolean;
  advanced_product_matching: boolean;
  bulk_processing: boolean;
}

export interface PlanLimits {
  transformations_per_month: number; // -1 for unlimited
  max_projects: number; // -1 for unlimited
  max_team_members: number;
  max_api_calls_per_day: number;
  max_resolution: string; // e.g., "1024x1024", "2048x2048", "4096x4096"
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  current_period_start: Date;
  current_period_end: Date;
  cancel_at_period_end: boolean;
  trial_end?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface UsageTracking {
  id: string;
  user_id: string;
  resource_type: 'transformation' | 'api_call' | 'export' | 'team_member';
  count: number;
  period_start: Date;
  period_end: Date;
  created_at: Date;
  updated_at: Date;
}

export interface TeamMember {
  id: string;
  team_owner_id: string;
  member_email: string;
  member_user_id?: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'pending' | 'active' | 'removed';
  invited_at: Date;
  joined_at?: Date;
}

export interface CustomBrandStyle {
  id: string;
  user_id: string;
  name: string;
  brand_colors: Record<string, string>;
  brand_materials: Record<string, string>;
  logo_url?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ApiKey {
  id: string;
  user_id: string;
  key_hash: string;
  name: string;
  last_used_at?: Date;
  created_at: Date;
  expires_at?: Date;
}

export interface UserPlanInfo {
  plan: SubscriptionPlan;
  subscription: UserSubscription;
  usage: {
    transformations: number;
    api_calls: number;
    team_members: number;
  };
  limits: PlanLimits;
}

export interface SubscriptionCheckoutSession {
  sessionId: string;
  url: string;
}

export interface SubscriptionPortalSession {
  url: string;
}
