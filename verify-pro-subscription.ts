import { Database } from './server/db';

async function verifyProSubscription() {
  try {
    console.log('🔍 Verifying Pro subscription for user1@gmail.com\n');
    console.log('═'.repeat(70));

    // Get user
    const userResult = await Database.query(
      'SELECT id, email FROM users WHERE email = $1',
      ['user1@gmail.com']
    );

    if ((userResult.rows as any[]).length === 0) {
      console.log('❌ User not found');
      process.exit(1);
    }

    const user = (userResult.rows as any[])[0];
    console.log(`\n👤 User: ${user.email} (ID: ${user.id})\n`);

    // Check subscription
    const subResult = await Database.query(
      `SELECT 
        id,
        plan_name,
        status,
        current_period_start,
        current_period_end,
        created_at,
        updated_at
       FROM user_subscriptions 
       WHERE user_id = $1`,
      [user.id]
    );

    if ((subResult.rows as any[]).length === 0) {
      console.log('❌ No subscription found');
      process.exit(1);
    }

    const subscription = (subResult.rows as any[])[0];
    console.log('✅ SUBSCRIPTION DETAILS:\n');
    console.log(`Plan: ${subscription.plan_name}`);
    console.log(`Status: ${subscription.status}`);
    console.log(`Period Start: ${new Date(subscription.current_period_start).toLocaleDateString()}`);
    console.log(`Period End: ${new Date(subscription.current_period_end).toLocaleDateString()}`);
    console.log(`Created: ${new Date(subscription.created_at).toLocaleString()}`);
    console.log(`Updated: ${new Date(subscription.updated_at).toLocaleString()}`);

    // Verify it's Pro
    if (subscription.plan_name.toLowerCase() === 'pro') {
      console.log('\n✅ ✅ ✅ PRO SUBSCRIPTION CONFIRMED! ✅ ✅ ✅');
    } else {
      console.log(`\n⚠️ Plan is ${subscription.plan_name}, not Pro`);
    }

    console.log('\n═'.repeat(70));
    console.log('\n✅ VERIFICATION COMPLETE\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyProSubscription();
