-- Migration: Add subscription and monetization tables
-- Created: 2026-01-11
-- Description: Implements tiered subscription system with Starter, Pro, and Business plans

-- ============================================
-- 1. SUBSCRIPTION PLANS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE, -- 'starter', 'pro', 'business'
  display_name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly', -- 'monthly', 'yearly'
  features JSONB NOT NULL DEFAULT '{}',
  limits JSONB NOT NULL DEFAULT '{}',
  stripe_price_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 2. USER SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'canceled', 'past_due', 'trialing', 'incomplete'
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  current_period_start TIMESTAMP NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMP NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  trial_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id) -- One subscription per user
);

-- ============================================
-- 3. USAGE TRACKING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_type VARCHAR(50) NOT NULL, -- 'transformation', 'api_call', 'export', 'team_member'
  count INTEGER DEFAULT 0,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, resource_type, period_start) -- One record per user/resource/period
);

-- ============================================
-- 4. TEAM MEMBERS TABLE (Business Plan)
-- ============================================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_email VARCHAR(255) NOT NULL,
  member_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'viewer', -- 'admin', 'editor', 'viewer'
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'removed'
  invited_at TIMESTAMP DEFAULT NOW(),
  joined_at TIMESTAMP,
  UNIQUE(team_owner_id, member_email)
);

-- ============================================
-- 5. CUSTOM BRAND STYLES TABLE (Business Plan)
-- ============================================
CREATE TABLE IF NOT EXISTS custom_brand_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  brand_colors JSONB DEFAULT '{}',
  brand_materials JSONB DEFAULT '{}',
  logo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 6. API KEYS TABLE (Business Plan)
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer ON user_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_subscription ON user_subscriptions(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_period ON usage_tracking(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_resource_type ON usage_tracking(resource_type);

CREATE INDEX IF NOT EXISTS idx_team_members_owner ON team_members(team_owner_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(member_email);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

-- ============================================
-- SEED DEFAULT SUBSCRIPTION PLANS
-- ============================================

-- Starter Plan (Free)
INSERT INTO subscription_plans (name, display_name, price, billing_cycle, features, limits)
VALUES (
  'starter',
  'Starter',
  0.00,
  'monthly',
  '{
    "unlimited_transformations": false,
    "premium_styles": false,
    "high_resolution_exports": false,
    "priority_generation": false,
    "ai_design_advice": false,
    "team_collaboration": false,
    "api_access": false,
    "custom_brand_styles": false,
    "whitelabel_reports": false,
    "dedicated_support": false,
    "advanced_product_matching": false,
    "bulk_processing": false
  }'::jsonb,
  '{
    "transformations_per_month": 5,
    "max_projects": 3,
    "max_team_members": 0,
    "max_api_calls_per_day": 0,
    "max_resolution": "1024x1024"
  }'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- Pro Plan ($499/month)
INSERT INTO subscription_plans (name, display_name, price, billing_cycle, features, limits)
VALUES (
  'pro',
  'Pro',
  499.00,
  'monthly',
  '{
    "unlimited_transformations": true,
    "premium_styles": true,
    "high_resolution_exports": true,
    "priority_generation": true,
    "ai_design_advice": true,
    "team_collaboration": false,
    "api_access": false,
    "custom_brand_styles": false,
    "whitelabel_reports": false,
    "dedicated_support": false,
    "advanced_product_matching": true,
    "bulk_processing": false
  }'::jsonb,
  '{
    "transformations_per_month": -1,
    "max_projects": -1,
    "max_team_members": 0,
    "max_api_calls_per_day": 0,
    "max_resolution": "2048x2048"
  }'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- Business Plan ($999/month)
INSERT INTO subscription_plans (name, display_name, price, billing_cycle, features, limits)
VALUES (
  'business',
  'Business',
  999.00,
  'monthly',
  '{
    "unlimited_transformations": true,
    "premium_styles": true,
    "high_resolution_exports": true,
    "priority_generation": true,
    "ai_design_advice": true,
    "team_collaboration": true,
    "api_access": true,
    "custom_brand_styles": true,
    "whitelabel_reports": true,
    "dedicated_support": true,
    "advanced_product_matching": true,
    "bulk_processing": true
  }'::jsonb,
  '{
    "transformations_per_month": -1,
    "max_projects": -1,
    "max_team_members": 10,
    "max_api_calls_per_day": 1000,
    "max_resolution": "4096x4096"
  }'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- TRIGGER: Auto-assign Starter plan to new users
-- ============================================
CREATE OR REPLACE FUNCTION assign_starter_plan()
RETURNS TRIGGER AS $$
DECLARE
  starter_plan_id UUID;
BEGIN
  -- Get the starter plan ID
  SELECT id INTO starter_plan_id FROM subscription_plans WHERE name = 'starter' LIMIT 1;
  
  -- Create subscription for new user
  INSERT INTO user_subscriptions (
    user_id,
    plan_id,
    status,
    current_period_start,
    current_period_end,
    cancel_at_period_end
  ) VALUES (
    NEW.id,
    starter_plan_id,
    'active',
    NOW(),
    NOW() + INTERVAL '1 year', -- Free plan never expires
    FALSE
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_assign_starter_plan
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION assign_starter_plan();

-- ============================================
-- TRIGGER: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_tracking_updated_at BEFORE UPDATE ON usage_tracking
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_brand_styles_updated_at BEFORE UPDATE ON custom_brand_styles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
