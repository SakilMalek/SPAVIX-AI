import { z } from 'zod';

// Plan types
export const PlanTierEnum = z.enum(['starter', 'pro', 'business']);
export type PlanTier = z.infer<typeof PlanTierEnum>;

export const SubscriptionStatusEnum = z.enum(['active', 'trial', 'suspended', 'cancelled', 'expired']);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusEnum>;

export const SubscriptionEventEnum = z.enum([
  'created',
  'upgraded',
  'downgraded',
  'renewed',
  'cancelled',
  'suspended',
  'reactivated',
]);
export type SubscriptionEvent = z.infer<typeof SubscriptionEventEnum>;

// Plan definition
export const PlanSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  tier: z.number().int(),
  price_monthly: z.number().int().default(0),
  price_annual: z.number().int().nullable().optional(),
  description: z.string().nullable().optional(),
  features: z.record(z.boolean()),
  limits: z.record(z.number().nullable()),
  created_at: z.date(),
  updated_at: z.date(),
});
export type Plan = z.infer<typeof PlanSchema>;

// Subscription
export const SubscriptionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  plan_id: z.string().uuid(),
  status: SubscriptionStatusEnum,
  billing_period_start: z.date(),
  billing_period_end: z.date().nullable(),
  payment_provider: z.string().nullable(),
  payment_method_id: z.string().nullable(),
  razorpay_subscription_id: z.string().nullable(),
  trial_ends_at: z.date().nullable(),
  trial_used: z.boolean().default(false),
  cancelled_at: z.date().nullable(),
  cancellation_reason: z.string().nullable(),
  metadata: z.record(z.any()).default({}),
  created_at: z.date(),
  updated_at: z.date(),
});
export type Subscription = z.infer<typeof SubscriptionSchema>;

// Usage tracking
export const UsageTrackingSchema = z.object({
  id: z.string().uuid(),
  subscription_id: z.string().uuid(),
  user_id: z.string().uuid(),
  feature_key: z.string(),
  usage_count: z.number().int().default(0),
  limit_per_month: z.number().int().nullable(),
  period_start: z.date(),
  period_end: z.date(),
  reset_at: z.date().nullable(),
  created_at: z.date(),
  updated_at: z.date(),
});
export type UsageTracking = z.infer<typeof UsageTrackingSchema>;

// Subscription history
export const SubscriptionHistorySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  subscription_id: z.string().uuid(),
  event_type: SubscriptionEventEnum,
  from_plan_id: z.string().uuid().nullable(),
  to_plan_id: z.string().uuid().nullable(),
  from_status: SubscriptionStatusEnum.nullable(),
  to_status: SubscriptionStatusEnum.nullable(),
  reason: z.string().nullable(),
  metadata: z.record(z.any()).default({}),
  created_at: z.date(),
});
export type SubscriptionHistory = z.infer<typeof SubscriptionHistorySchema>;

// Entitlements
export const EntitlementSchema = z.object({
  id: z.string().uuid(),
  plan_id: z.string().uuid(),
  feature_key: z.string(),
  feature_name: z.string(),
  enabled: z.boolean().default(true),
  limit_value: z.number().int().nullable(),
  description: z.string().nullable(),
  created_at: z.date(),
  updated_at: z.date(),
});
export type Entitlement = z.infer<typeof EntitlementSchema>;

// Organization (Phase 3)
export const OrganizationSchema = z.object({
  id: z.string().uuid(),
  subscription_id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  owner_id: z.string().uuid(),
  logo_url: z.string().nullable(),
  brand_color: z.string().nullable(),
  custom_domain: z.string().nullable(),
  metadata: z.record(z.any()).default({}),
  created_at: z.date(),
  updated_at: z.date(),
});
export type Organization = z.infer<typeof OrganizationSchema>;

// Organization member
export const OrganizationMemberSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'member']).default('member'),
  joined_at: z.date(),
});
export type OrganizationMember = z.infer<typeof OrganizationMemberSchema>;

// API Key (Phase 3)
export const ApiKeySchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  name: z.string(),
  key_hash: z.string(),
  last_used_at: z.date().nullable(),
  created_at: z.date(),
  expires_at: z.date().nullable(),
  revoked_at: z.date().nullable(),
});
export type ApiKey = z.infer<typeof ApiKeySchema>;

// API Request/Response types
export const GetSubscriptionResponseSchema = z.object({
  subscription: SubscriptionSchema.extend({
    plan: PlanSchema,
  }),
  usage: z.record(
    z.object({
      used: z.number().int(),
      limit: z.number().int().nullable(),
      unlimited: z.boolean(),
      reset_at: z.date(),
    })
  ),
  features: z.record(z.boolean()),
});
export type GetSubscriptionResponse = z.infer<typeof GetSubscriptionResponseSchema>;

export const SelectPlanRequestSchema = z.object({
  plan_slug: z.string(),
});
export type SelectPlanRequest = z.infer<typeof SelectPlanRequestSchema>;

export const UpgradePlanRequestSchema = z.object({
  plan_slug: z.string(),
  payment_method_id: z.string().optional(),
});
export type UpgradePlanRequest = z.infer<typeof UpgradePlanRequestSchema>;

export const CancelSubscriptionRequestSchema = z.object({
  reason: z.string().optional(),
});
export type CancelSubscriptionRequest = z.infer<typeof CancelSubscriptionRequestSchema>;

export const CheckFeatureRequestSchema = z.object({
  feature_key: z.string(),
});
export type CheckFeatureRequest = z.infer<typeof CheckFeatureRequestSchema>;

export const CheckFeatureResponseSchema = z.object({
  allowed: z.boolean(),
  reason: z.string().optional(),
});
export type CheckFeatureResponse = z.infer<typeof CheckFeatureResponseSchema>;

export const RecordUsageRequestSchema = z.object({
  feature_key: z.string(),
  amount: z.number().int().default(1),
});
export type RecordUsageRequest = z.infer<typeof RecordUsageRequestSchema>;

export const RecordUsageResponseSchema = z.object({
  success: z.boolean(),
  usage: z.object({
    used: z.number().int(),
    limit: z.number().int().nullable(),
    remaining: z.number().int().nullable(),
  }),
});
export type RecordUsageResponse = z.infer<typeof RecordUsageResponseSchema>;

export const CheckUsageRequestSchema = z.object({
  feature_key: z.string(),
  amount: z.number().int().default(1),
});
export type CheckUsageRequest = z.infer<typeof CheckUsageRequestSchema>;

export const CheckUsageResponseSchema = z.object({
  allowed: z.boolean(),
  used: z.number().int(),
  limit: z.number().int().nullable(),
  remaining: z.number().int().nullable(),
});
export type CheckUsageResponse = z.infer<typeof CheckUsageResponseSchema>;

// Plan constants
export const PLAN_DEFINITIONS = {
  starter: {
    id: 'plan_starter',
    name: 'Starter',
    slug: 'starter',
    tier: 1,
    price_monthly: 0,
    price_annual: null,
    description: 'Perfect for getting started',
    features: {
      transformations: true,
      standard_styles: true,
      basic_product_detection: true,
      community_support: true,
      premium_styles: false,
      advanced_product_matching: false,
      high_resolution_exports: false,
      priority_generation: false,
      personalized_advice: false,
      team_collaboration: false,
      api_access: false,
      custom_branding: false,
      whitelabel_reports: false,
      dedicated_support: false,
    },
    limits: {
      transformations_per_month: 5,
      max_projects: 3,
      transformations_per_project: 5,
      export_resolution: 'standard',
      concurrent_generations: 1,
      storage_gb: 1,
      api_calls_per_month: 0,
    },
  },
  pro: {
    id: 'plan_pro',
    name: 'Pro',
    slug: 'pro',
    tier: 2,
    price_monthly: 1900,
    price_annual: 19000,
    description: 'For serious designers',
    features: {
      transformations: true,
      standard_styles: true,
      basic_product_detection: true,
      community_support: true,
      premium_styles: true,
      advanced_product_matching: true,
      high_resolution_exports: true,
      priority_generation: true,
      personalized_advice: true,
      team_collaboration: false,
      api_access: false,
      custom_branding: false,
      whitelabel_reports: false,
      dedicated_support: false,
    },
    limits: {
      transformations_per_month: null,
      max_projects: null,
      transformations_per_project: null,
      export_resolution: 'high',
      concurrent_generations: 3,
      storage_gb: 50,
      api_calls_per_month: 0,
    },
  },
  business: {
    id: 'plan_business',
    name: 'Business',
    slug: 'business',
    tier: 3,
    price_monthly: 4900,
    price_annual: 49000,
    description: 'For teams and agencies',
    features: {
      transformations: true,
      standard_styles: true,
      basic_product_detection: true,
      community_support: true,
      premium_styles: true,
      advanced_product_matching: true,
      high_resolution_exports: true,
      priority_generation: true,
      personalized_advice: true,
      team_collaboration: true,
      api_access: true,
      custom_branding: true,
      whitelabel_reports: true,
      dedicated_support: true,
    },
    limits: {
      transformations_per_month: null,
      max_projects: null,
      transformations_per_project: null,
      export_resolution: 'ultra',
      concurrent_generations: 10,
      storage_gb: 500,
      api_calls_per_month: 100000,
      team_members: null,
    },
  },
} as const;

export type PlanDefinition = typeof PLAN_DEFINITIONS[keyof typeof PLAN_DEFINITIONS];
