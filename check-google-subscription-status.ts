import { Database } from './server/db';

async function checkSubscriptionStatus() {
  try {
    console.log('🔍 Checking subscription status for maleksameer528@gmail.com\n');
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

    // Get ALL subscriptions (regardless of status)
    const subResult = await Database.query(
      `SELECT 
        us.id,
        us.user_id,
        sp.name as plan_name,
        us.status,
        us.created_at,
        us.updated_at
       FROM user_subscriptions us
       LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
       WHERE us.user_id = $1`,
      [user.id]
    );

    console.log(`📊 ALL SUBSCRIPTIONS FOR THIS USER:\n`);
    if ((subResult.rows as any[]).length === 0) {
      console.log('❌ NO SUBSCRIPTIONS FOUND');
    } else {
      (subResult.rows as any[]).forEach((sub, idx) => {
        console.log(`Subscription ${idx + 1}:`);
        console.log(`  Plan: ${sub.plan_name}`);
        console.log(`  Status: ${sub.status}`);
        console.log(`  Created: ${new Date(sub.created_at).toLocaleString()}`);
        console.log(`  Updated: ${new Date(sub.updated_at).toLocaleString()}`);
      });
    }

    console.log('\n═'.repeat(70));
    console.log('\n✅ CHECK COMPLETE\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkSubscriptionStatus();
