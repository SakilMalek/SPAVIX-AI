-- Migration: Add Razorpay support fields
-- Created: 2026-01-11
-- Description: Adds Razorpay customer and subscription IDs to support Indian market

-- Add Razorpay fields to subscription_plans table
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS razorpay_plan_id VARCHAR(255);

-- Add Razorpay fields to user_subscriptions table
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS razorpay_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS razorpay_subscription_id VARCHAR(255);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_razorpay_customer ON user_subscriptions(razorpay_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_razorpay_subscription ON user_subscriptions(razorpay_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_razorpay_plan ON subscription_plans(razorpay_plan_id);
