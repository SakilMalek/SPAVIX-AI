import { Database } from './server/db';
import { SubscriptionService } from './server/services/subscription.service';

async function testSubscriptionCreation() {
  try {
    console.log('🧪 Testing subscription creation\n');
    console.log('═'.repeat(70));

    // Create a test user
    const testEmail = `test-${Date.now()}@gmail.com`;
    console.log(`\n📝 Creating test user: ${testEmail}\n`);
    
    const user = await Database.createUser(testEmail, 'hashedpassword', 'Test User', null);
    console.log(`✅ User created: ${user.id}\n`);

    // Create subscription for the user
    console.log('🔄 Creating subscription...\n');
    const subscription = await SubscriptionService.createSubscription(user.id, 'Starter');
    console.log(`✅ Subscription created: ${subscription.id}\n`);

    // Verify subscription in database
    console.log('📊 Verifying subscription in database...\n');
    const planInfo = await SubscriptionService.getUserPlan(user.id);
    
    if (planInfo) {
      console.log(`✅ Plan: ${planInfo.plan.name}`);
      console.log(`✅ Status: ${planInfo.subscription.status}`);
    } else {
      console.log('❌ No subscription found');
    }

    console.log('\n═'.repeat(70));
    console.log('\n✅ TEST COMPLETE\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testSubscriptionCreation();
