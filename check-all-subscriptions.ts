import { Database } from './server/db';

async function checkAllSubscriptions() {
  try {
    console.log('🔍 Checking all subscriptions in database\n');
    console.log('═'.repeat(70));

    // Get all users
    const usersResult = await Database.query(
      `SELECT id, email FROM users ORDER BY created_at DESC LIMIT 10`
    );

    const users = (usersResult.rows as any[]);
    console.log(`\n📊 Checking ${users.length} recent users:\n`);

    for (const user of users) {
      // Check subscription
      const subResult = await Database.query(
        `SELECT 
          us.id,
          sp.name as plan_name,
          us.status
         FROM user_subscriptions us
         LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
         WHERE us.user_id = $1`,
        [user.id]
      );

      if ((subResult.rows as any[]).length === 0) {
        console.log(`❌ ${user.email} - NO SUBSCRIPTION`);
      } else {
        const subscription = (subResult.rows as any[])[0];
        console.log(`✅ ${user.email} - Plan: ${subscription.plan_name} (${subscription.status})`);
      }
    }

    console.log('\n═'.repeat(70));
    console.log('\n✅ CHECK COMPLETE\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAllSubscriptions();
