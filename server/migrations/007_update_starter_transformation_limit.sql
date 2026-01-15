-- Update Starter plan transformation limit from 5 to 8 for testing per-project limits
UPDATE subscription_plans
SET limits = jsonb_set(limits, '{transformations_per_month}', '8')
WHERE name = 'Starter';
