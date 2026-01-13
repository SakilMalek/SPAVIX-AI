-- Migration: 004_subscription_system.sql
-- Description: Core subscription system tables
-- Phase: 1 (Starter only)

CREATE TABLE IF NOT EXISTS plans (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(50) NOT NULL UNIQUE, slug VARCHAR(50) NOT NULL UNIQUE, tier INT NOT NULL, price_monthly INT NOT NULL DEFAULT 0, price_annual INT, description TEXT, features JSONB NOT NULL DEFAULT '{}', limits JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());

CREATE TABLE IF NOT EXISTS subscriptions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, plan_id UUID NOT NULL REFERENCES plans(id), status VARCHAR(20) NOT NULL DEFAULT 'active', billing_period_start TIMESTAMP NOT NULL DEFAULT NOW(), billing_period_end TIMESTAMP, payment_provider VARCHAR(50), payment_method_id VARCHAR(255), razorpay_subscription_id VARCHAR(255), trial_ends_at TIMESTAMP, trial_used BOOLEAN DEFAULT FALSE, cancelled_at TIMESTAMP, cancellation_reason TEXT, metadata JSONB DEFAULT '{}', created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW(), CONSTRAINT valid_status CHECK (status IN ('active', 'trial', 'suspended', 'cancelled', 'expired')), UNIQUE(user_id));

CREATE TABLE IF NOT EXISTS usage_tracking (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, feature_key VARCHAR(100) NOT NULL, usage_count INT NOT NULL DEFAULT 0, limit_per_month INT, period_start TIMESTAMP NOT NULL, period_end TIMESTAMP NOT NULL, reset_at TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW(), UNIQUE(subscription_id, feature_key, period_start));

CREATE TABLE IF NOT EXISTS subscription_history (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE, event_type VARCHAR(50) NOT NULL, from_plan_id UUID REFERENCES plans(id), to_plan_id UUID REFERENCES plans(id), from_status VARCHAR(20), to_status VARCHAR(20), reason TEXT, metadata JSONB DEFAULT '{}', created_at TIMESTAMP NOT NULL DEFAULT NOW());

CREATE TABLE IF NOT EXISTS entitlements (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE, feature_key VARCHAR(100) NOT NULL, feature_name VARCHAR(255) NOT NULL, enabled BOOLEAN DEFAULT TRUE, limit_value INT, description TEXT, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW(), UNIQUE(plan_id, feature_key));

CREATE TABLE IF NOT EXISTS organizations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), subscription_id UUID NOT NULL REFERENCES subscriptions(id), name VARCHAR(255) NOT NULL, slug VARCHAR(100) NOT NULL UNIQUE, owner_id UUID NOT NULL REFERENCES users(id), logo_url TEXT, brand_color VARCHAR(7), custom_domain VARCHAR(255), metadata JSONB DEFAULT '{}', created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());

CREATE TABLE IF NOT EXISTS organization_members (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, role VARCHAR(50) NOT NULL DEFAULT 'member', joined_at TIMESTAMP NOT NULL DEFAULT NOW(), UNIQUE(organization_id, user_id));

CREATE TABLE IF NOT EXISTS api_keys (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, name VARCHAR(255) NOT NULL, key_hash VARCHAR(255) NOT NULL UNIQUE, last_used_at TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT NOW(), expires_at TIMESTAMP, revoked_at TIMESTAMP);

ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id);

ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES plans(id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_subscription_id ON usage_tracking(subscription_id);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_feature_key ON usage_tracking(feature_key);

CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON subscription_history(user_id);

CREATE INDEX IF NOT EXISTS idx_subscription_history_subscription_id ON subscription_history(subscription_id);

CREATE INDEX IF NOT EXISTS idx_organization_members_organization_id ON organization_members(organization_id);

CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);

CREATE INDEX IF NOT EXISTS idx_api_keys_organization_id ON api_keys(organization_id);

CREATE INDEX IF NOT EXISTS idx_users_subscription_id ON users(subscription_id);

CREATE INDEX IF NOT EXISTS idx_users_plan_id ON users(plan_id);
