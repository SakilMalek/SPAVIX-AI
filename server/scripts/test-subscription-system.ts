/**
 * Test Subscription System (Phase 1 & 2)
 * Comprehensive testing of database, services, and middleware
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { SubscriptionService } from '../services/subscription.js';
import { Database } from '../db.js';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

let testUserId: string | null = null;

async function runTests() {
  console.log('🧪 Starting Subscription System Tests...\n');

  try {
    // TEST 1: Verify tables exist
    await test1_VerifyTablesExist();

    // TEST 2: Verify plans are seeded
    await test2_VerifyPlansSeeded();

    // TEST 3: Test auto-assignment trigger
    await test3_AutoAssignmentTrigger();

    // TEST 4: Test subscription service methods
    await test4_SubscriptionServiceMethods();

    // TEST 5: Test usage tracking
    await test5_UsageTracking();

    // TEST 6: Test permission checks
    await test6_PermissionChecks();

    // TEST 7: Test plan changes
    await test7_PlanChanges();

    // TEST 8: Test usage stats
    await test8_UsageStats();

    console.log('\n✅ ALL TESTS PASSED! 🎉\n');
    console.log('Phase 1 & 2 are working correctly. Ready for Phase 3.');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  } finally {
    // Cleanup test user
    if (testUserId) {
      console.log('\n🧹 Cleaning up test data...');
      await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
      console.log('✅ Test data cleaned up');
    }
    await pool.end();
  }
}

async function test1_VerifyTablesExist() {
  console.log('TEST 1: Verifying database tables exist...');
  
  const tables = [
    'subscription_plans',
    'user_subscriptions',
    'usage_tracking',
    'team_members',
    'custom_brand_styles',
    'api_keys'
  ];

  for (const table of tables) {
    const result = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )`,
      [table]
    );

    if (!result.rows[0].exists) {
      throw new Error(`Table ${table} does not exist`);
    }
    console.log(`  ✓ Table '${table}' exists`);
  }

  console.log('✅ TEST 1 PASSED: All tables exist\n');
}

async function test2_VerifyPlansSeeded() {
  console.log('TEST 2: Verifying subscription plans are seeded...');

  const result = await pool.query(
    'SELECT name, display_name, price FROM subscription_plans ORDER BY price ASC'
  );

  if (result.rows.length !== 3) {
    throw new Error(`Expected 3 plans, found ${result.rows.length}`);
  }

  const expectedPlans = [
    { name: 'starter', display_name: 'Starter', price: '0.00' },
    { name: 'pro', display_name: 'Pro', price: '19.00' },
    { name: 'business', display_name: 'Business', price: '49.00' }
  ];

  for (let i = 0; i < expectedPlans.length; i++) {
    const expected = expectedPlans[i];
    const actual = result.rows[i];

    if (actual.name !== expected.name || actual.price !== expected.price) {
      throw new Error(`Plan mismatch at index ${i}: expected ${expected.name}, got ${actual.name}`);
    }
    console.log(`  ✓ ${actual.display_name}: $${actual.price}/month`);
  }

  console.log('✅ TEST 2 PASSED: All plans seeded correctly\n');
}

async function test3_AutoAssignmentTrigger() {
  console.log('TEST 3: Testing auto-assignment trigger...');

  // Create a test user
  const userResult = await pool.query(
    `INSERT INTO users (email, password_hash, name)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [`test-${Date.now()}@example.com`, 'test_hash', 'Test User']
  );

  testUserId = userResult.rows[0].id;
  console.log(`  ✓ Created test user: ${testUserId}`);

  // Wait a moment for trigger to execute
  await new Promise(resolve => setTimeout(resolve, 500));

  // Check if user has a subscription
  const subResult = await pool.query(
    `SELECT us.*, sp.name as plan_name, sp.display_name
     FROM user_subscriptions us
     JOIN subscription_plans sp ON us.plan_id = sp.id
     WHERE us.user_id = $1`,
    [testUserId]
  );

  if (subResult.rows.length === 0) {
    throw new Error('User was not auto-assigned a subscription');
  }

  const subscription = subResult.rows[0];

  if (subscription.plan_name !== 'starter') {
    throw new Error(`Expected 'starter' plan, got '${subscription.plan_name}'`);
  }

  if (subscription.status !== 'active') {
    throw new Error(`Expected 'active' status, got '${subscription.status}'`);
  }

  console.log(`  ✓ User auto-assigned to: ${subscription.display_name}`);
  console.log(`  ✓ Subscription status: ${subscription.status}`);
  console.log('✅ TEST 3 PASSED: Auto-assignment trigger works\n');
}

async function test4_SubscriptionServiceMethods() {
  console.log('TEST 4: Testing SubscriptionService methods...');

  if (!testUserId) {
    throw new Error('Test user not created');
  }

  // Test getUserPlan
  const planInfo = await SubscriptionService.getUserPlan(testUserId);

  if (!planInfo) {
    throw new Error('getUserPlan returned null');
  }

  console.log(`  ✓ getUserPlan() works`);
  console.log(`    - Plan: ${planInfo.plan.display_name}`);
  console.log(`    - Price: $${planInfo.plan.price}/month`);
  console.log(`    - Status: ${planInfo.subscription.status}`);

  // Test getAllPlans
  const allPlans = await SubscriptionService.getAllPlans();

  if (allPlans.length !== 3) {
    throw new Error(`Expected 3 plans, got ${allPlans.length}`);
  }

  console.log(`  ✓ getAllPlans() works (${allPlans.length} plans)`);

  // Test getUserPriority
  const priority = await SubscriptionService.getUserPriority(testUserId);

  if (priority !== 3) {
    throw new Error(`Expected priority 3 for Starter, got ${priority}`);
  }

  console.log(`  ✓ getUserPriority() works (priority: ${priority})`);

  // Test getMaxResolution
  const resolution = await SubscriptionService.getMaxResolution(testUserId);

  if (resolution !== '1024x1024') {
    throw new Error(`Expected 1024x1024, got ${resolution}`);
  }

  console.log(`  ✓ getMaxResolution() works (${resolution})`);

  console.log('✅ TEST 4 PASSED: All service methods work\n');
}

async function test5_UsageTracking() {
  console.log('TEST 5: Testing usage tracking...');

  if (!testUserId) {
    throw new Error('Test user not created');
  }

  // Track some usage
  await SubscriptionService.trackUsage(testUserId, 'transformation');
  console.log('  ✓ Tracked 1 transformation');

  await SubscriptionService.trackUsage(testUserId, 'transformation');
  console.log('  ✓ Tracked 2nd transformation');

  await SubscriptionService.trackUsage(testUserId, 'transformation');
  console.log('  ✓ Tracked 3rd transformation');

  // Get usage stats
  const stats = await SubscriptionService.getUsageStats(testUserId);

  if (!stats) {
    throw new Error('getUsageStats returned null');
  }

  if (stats.current_period.transformations !== 3) {
    throw new Error(`Expected 3 transformations, got ${stats.current_period.transformations}`);
  }

  console.log(`  ✓ Usage tracked correctly: ${stats.current_period.transformations}/5 transformations`);
  console.log(`  ✓ Percentage used: ${stats.percentage_used.transformations.toFixed(1)}%`);

  console.log('✅ TEST 5 PASSED: Usage tracking works\n');
}

async function test6_PermissionChecks() {
  console.log('TEST 6: Testing permission checks...');

  if (!testUserId) {
    throw new Error('Test user not created');
  }

  // Test transformation permission (should be true, 3/5 used)
  const canTransform = await SubscriptionService.canPerformAction(testUserId, 'transformation');
  if (!canTransform) {
    throw new Error('Starter user should be able to transform (3/5 used)');
  }
  console.log('  ✓ Can perform transformation (3/5 used)');

  // Test premium styles (should be false for Starter)
  const canUsePremium = await SubscriptionService.canPerformAction(testUserId, 'premium_styles');
  if (canUsePremium) {
    throw new Error('Starter user should NOT have premium styles');
  }
  console.log('  ✓ Cannot use premium styles (Starter plan)');

  // Test high resolution export (should be false for Starter)
  const canExportHD = await SubscriptionService.canPerformAction(testUserId, 'high_resolution_export');
  if (canExportHD) {
    throw new Error('Starter user should NOT have high resolution exports');
  }
  console.log('  ✓ Cannot export high resolution (Starter plan)');

  // Test API access (should be false for Starter)
  const canUseAPI = await SubscriptionService.canPerformAction(testUserId, 'api_access');
  if (canUseAPI) {
    throw new Error('Starter user should NOT have API access');
  }
  console.log('  ✓ Cannot use API (Starter plan)');

  console.log('✅ TEST 6 PASSED: Permission checks work correctly\n');
}

async function test7_PlanChanges() {
  console.log('TEST 7: Testing plan changes...');

  if (!testUserId) {
    throw new Error('Test user not created');
  }

  // Upgrade to Pro
  await SubscriptionService.changePlan(testUserId, 'pro');
  console.log('  ✓ Upgraded to Pro plan');

  // Verify plan changed
  const planInfo = await SubscriptionService.getUserPlan(testUserId);
  if (!planInfo || planInfo.plan.name !== 'pro') {
    throw new Error('Plan did not change to Pro');
  }
  console.log(`  ✓ Verified plan is now: ${planInfo.plan.display_name}`);

  // Test premium features now available
  const canUsePremium = await SubscriptionService.canPerformAction(testUserId, 'premium_styles');
  if (!canUsePremium) {
    throw new Error('Pro user should have premium styles');
  }
  console.log('  ✓ Premium styles now available');

  // Test unlimited transformations
  const canTransform = await SubscriptionService.canPerformAction(testUserId, 'transformation');
  if (!canTransform) {
    throw new Error('Pro user should have unlimited transformations');
  }
  console.log('  ✓ Unlimited transformations available');

  // Downgrade back to Starter
  await SubscriptionService.changePlan(testUserId, 'starter');
  console.log('  ✓ Downgraded back to Starter');

  console.log('✅ TEST 7 PASSED: Plan changes work correctly\n');
}

async function test8_UsageStats() {
  console.log('TEST 8: Testing usage statistics...');

  if (!testUserId) {
    throw new Error('Test user not created');
  }

  // Track 2 more transformations (total 5/5)
  await SubscriptionService.trackUsage(testUserId, 'transformation');
  await SubscriptionService.trackUsage(testUserId, 'transformation');

  const stats = await SubscriptionService.getUsageStats(testUserId);

  if (!stats) {
    throw new Error('getUsageStats returned null');
  }

  console.log(`  ✓ Current usage: ${stats.current_period.transformations}/${stats.limits.transformations_per_month}`);
  console.log(`  ✓ Percentage: ${stats.percentage_used.transformations.toFixed(1)}%`);

  // Should be at limit now
  if (stats.current_period.transformations !== 5) {
    throw new Error(`Expected 5 transformations, got ${stats.current_period.transformations}`);
  }

  // Should not be able to transform anymore
  const canTransform = await SubscriptionService.canPerformAction(testUserId, 'transformation');
  if (canTransform) {
    throw new Error('Should not be able to transform at 5/5 limit');
  }
  console.log('  ✓ Correctly blocked at limit (5/5)');

  console.log('✅ TEST 8 PASSED: Usage stats and limits work correctly\n');
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
