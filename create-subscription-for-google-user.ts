import { Database } from './server/db';
import { SubscriptionService } from './server/services/subscription';

async function createSubscriptionForGoogleUser() {
  try {
    console.log('🔧 Creating subscription for maleksameer528@gmail.com\n');
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

    // Create subscription
    console.log('🔄 Creating subscription...\n');
    await SubscriptionService.createSubscription(user.id, 'starter');
    console.log('✅ Subscription created\n');

    // Verify
    console.log('📊 Verifying subscription:\n');
    const planInfo = await SubscriptionService.getUserPlan(user.id);
    if (planInfo) {
      console.log(`✅ Plan: ${planInfo.plan.name}`);
      console.log(`✅ Status: ${planInfo.subscription.status}`);
    } else {
      console.log('❌ Subscription not found');
    }

    console.log('\n═'.repeat(70));
    console.log('\n✅ COMPLETE\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createSubscriptionForGoogleUser();
