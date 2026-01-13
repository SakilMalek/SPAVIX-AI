import { Database } from './server/db';
import { SubscriptionService } from './server/services/subscription';

async function debugGooglePlanChange() {
  try {
    console.log('🔍 Debugging plan change for maleksameer528@gmail.com\n');
    console.log('═'.repeat(70));

    // Get user
    const userResult = await Database.query(
      'SELECT id, email FROM users WHERE email = $1',
      ['maleksameer528@gmail.com']
    );

    if ((userResult.rows as any[]).length === 0) {
      console.log('❌ User not found');
      process.exit(1);
    }

    const user = (userResult.rows as any[])[0];
    console.log(`\n👤 User: ${user.email} (ID: ${user.id})\n`);

    // Get current plan
    console.log('📊 CURRENT SUBSCRIPTION:\n');
    let planInfo = await SubscriptionService.getUserPlan(user.id);
    console.log(`Current Plan: ${planInfo?.plan.name}`);
    console.log(`Status: ${planInfo?.subscription.status}`);

    // Try to change to Pro
    console.log('\n🔄 Attempting to change to Pro plan...\n');
    await SubscriptionService.changePlan(user.id, 'pro');

    // Get plan after change
    console.log('📊 AFTER CHANGE:\n');
    planInfo = await SubscriptionService.getUserPlan(user.id);
    console.log(`Current Plan: ${planInfo?.plan.name}`);
    console.log(`Status: ${planInfo?.subscription.status}`);

    // Direct database check
    console.log('\n📊 DIRECT DATABASE CHECK:\n');
    const dbResult = await Database.query(
      `SELECT 
        us.id,
        sp.name as plan_name,
        us.status,
        us.updated_at
       FROM user_subscriptions us
       LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
       WHERE us.user_id = $1`,
      [user.id]
    );

    if ((dbResult.rows as any[]).length > 0) {
      const sub = (dbResult.rows as any[])[0];
      console.log(`Plan in DB: ${sub.plan_name}`);
      console.log(`Status in DB: ${sub.status}`);
      console.log(`Updated at: ${new Date(sub.updated_at).toLocaleString()}`);
    }

    console.log('\n═'.repeat(70));
    console.log('\n✅ DEBUG COMPLETE\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugGooglePlanChange();
