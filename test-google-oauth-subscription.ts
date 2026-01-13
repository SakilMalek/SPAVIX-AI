import { Database } from './server/db';
import { SubscriptionService } from './server/services/subscription';

async function testGoogleOAuthSubscription() {
  try {
    console.log('🧪 Testing Google OAuth subscription functionality\n');
    console.log('═'.repeat(70));

    // Get all users and check their subscriptions
    const usersResult = await Database.query(
      `SELECT id, email, name FROM users ORDER BY created_at DESC LIMIT 5`
    );

    const users = (usersResult.rows as any[]);
    console.log(`\n📊 Found ${users.length} recent users:\n`);

    for (const user of users) {
      console.log(`\n👤 User: ${user.email} (ID: ${user.id})`);
      
      // Check if user has subscription
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
        console.log('   ❌ NO SUBSCRIPTION FOUND');
      } else {
        const subscription = (subResult.rows as any[])[0];
        console.log(`   ✅ Plan: ${subscription.plan_name} (Status: ${subscription.status})`);
      }
    }

    console.log('\n═'.repeat(70));
    console.log('\n✅ TEST COMPLETE\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testGoogleOAuthSubscription();
