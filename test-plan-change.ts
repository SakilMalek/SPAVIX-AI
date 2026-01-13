import { Database } from './server/db';
import { SubscriptionService } from './server/services/subscription';

async function testPlanChange() {
  try {
    console.log('🧪 Testing plan change for user1@gmail.com\n');
    console.log('═'.repeat(70));

    const userId = '596af833-df6e-4cd5-a7aa-73ce11356b88'; // user1@gmail.com

    // Get current plan
    console.log('\n📊 BEFORE CHANGE:\n');
    let planInfo = await SubscriptionService.getUserPlan(userId);
    console.log(`Current Plan: ${planInfo?.plan.name}`);

    // Change to Starter
    console.log('\n🔄 Changing to Starter plan...\n');
    await SubscriptionService.changePlan(userId, 'starter');

    // Get plan after change
    console.log('📊 AFTER CHANGE:\n');
    planInfo = await SubscriptionService.getUserPlan(userId);
    console.log(`Current Plan: ${planInfo?.plan.name}`);

    if (planInfo?.plan.name === 'starter') {
      console.log('\n✅ Plan change successful!');
    } else {
      console.log('\n❌ Plan change failed - still on', planInfo?.plan.name);
    }

    console.log('\n═'.repeat(70));
    console.log('\n✅ TEST COMPLETE\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testPlanChange();
