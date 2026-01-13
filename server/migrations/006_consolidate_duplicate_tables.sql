-- Migration: 006_consolidate_duplicate_tables.sql
-- Description: Consolidate duplicate subscription tables
-- Safety: All merges are safe - no active code references shadow tables

-- ============================================
-- MERGE 1: plans → subscription_plans
-- ============================================

-- Step 1: Migrate any data from plans to subscription_plans
INSERT INTO subscription_plans (id, name, slug, tier, price_monthly, price_annual, description, features, limits, created_at, updated_at)
SELECT id, name, slug, tier, price_monthly, price_annual, description, features, limits, created_at, updated_at
FROM plans
ON CONFLICT (slug) DO UPDATE SET
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  updated_at = NOW();

-- Step 2: Drop plans table (no foreign keys reference it from active code)
DROP TABLE IF EXISTS plans CASCADE;

-- ============================================
-- MERGE 2: subscriptions → user_subscriptions
-- ============================================

-- Step 1: Migrate any data from subscriptions to user_subscriptions
INSERT INTO user_subscriptions (
  id, user_id, plan_id, status, 
  current_period_start, current_period_end,
  stripe_customer_id, stripe_subscription_id,
  razorpay_customer_id, razorpay_subscription_id,
  created_at, updated_at
)
SELECT 
  id, user_id, plan_id, status,
  billing_period_start, billing_period_end,
  NULL, NULL,
  NULL, razorpay_subscription_id,
  created_at, updated_at
FROM subscriptions
ON CONFLICT (user_id) DO UPDATE SET
  plan_id = EXCLUDED.plan_id,
  status = EXCLUDED.status,
  current_period_start = EXCLUDED.current_period_start,
  current_period_end = EXCLUDED.current_period_end,
  updated_at = NOW();

-- Step 2: Drop subscriptions table (no foreign keys reference it from active code)
DROP TABLE IF EXISTS subscriptions CASCADE;

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify subscription_plans has data
SELECT COUNT(*) as subscription_plans_count FROM subscription_plans;

-- Verify user_subscriptions has data
SELECT COUNT(*) as user_subscriptions_count FROM user_subscriptions;

-- Verify no orphaned foreign keys
SELECT COUNT(*) as orphaned_users FROM users WHERE subscription_id IS NOT NULL AND subscription_id NOT IN (SELECT id FROM user_subscriptions);
