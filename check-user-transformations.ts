import { Database } from './server/db';

async function checkUserTransformations() {
  try {
    console.log('🔍 Checking transformations for user1@gmail.com\n');
    console.log('═'.repeat(70));

    // Get user by email
    const userResult = await Database.query(
      'SELECT id, email, subscription_id, plan_id FROM users WHERE email = $1',
      ['user1@gmail.com']
    );

    if ((userResult.rows as any[]).length === 0) {
      console.log('❌ User not found: user1@gmail.com');
      process.exit(1);
    }

    const user = (userResult.rows as any[])[0];
    console.log('\n👤 USER INFORMATION:\n');
    console.log(`Email: ${user.email}`);
    console.log(`User ID: ${user.id}`);
    console.log(`Subscription ID: ${user.subscription_id}`);
    console.log(`Plan ID: ${user.plan_id}`);

    // Get user's subscription details
    if (user.subscription_id) {
      const subResult = await Database.query(
        `SELECT us.*, sp.name as plan_name
         FROM user_subscriptions us
         LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
         WHERE us.id = $1`,
        [user.subscription_id]
      );

      if ((subResult.rows as any[]).length > 0) {
        const sub = (subResult.rows as any[])[0];
        console.log(`\n📊 SUBSCRIPTION:\n`);
        console.log(`Plan: ${sub.plan_name}`);
        console.log(`Status: ${sub.status}`);
        console.log(`Period: ${sub.current_period_start} to ${sub.current_period_end}`);
      }
    }

    // Check transformations
    console.log('\n🎨 TRANSFORMATIONS:\n');
    const transformResult = await Database.query(
      'SELECT id, room_type, style, created_at FROM transformations WHERE user_id = $1 ORDER BY created_at DESC',
      [user.id]
    );

    if ((transformResult.rows as any[]).length === 0) {
      console.log('❌ No transformations found for this user');
    } else {
      console.log(`✅ Found ${transformResult.rows.length} transformations:\n`);
      (transformResult.rows as any[]).forEach((t, i) => {
        console.log(`${i + 1}. ID: ${t.id}`);
        console.log(`   Room Type: ${t.room_type}`);
        console.log(`   Style: ${t.style}`);
        console.log(`   Created: ${t.created_at}\n`);
      });
    }

    // Check usage tracking
    console.log('📈 USAGE TRACKING:\n');
    const usageResult = await Database.query(
      `SELECT * FROM usage_tracking 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [user.id]
    );

    if ((usageResult.rows as any[]).length === 0) {
      console.log('❌ No usage tracking records found');
    } else {
      console.log(`✅ Found ${usageResult.rows.length} usage records:\n`);
      (usageResult.rows as any[]).forEach((u, i) => {
        console.log(`${i + 1}. Feature: ${u.feature_key}`);
        console.log(`   Count: ${u.count}`);
        console.log(`   Period: ${u.period_start} to ${u.period_end}`);
        console.log(`   Created: ${u.created_at}\n`);
      });
    }

    console.log('═'.repeat(70));
    console.log('\n✅ CHECK COMPLETE\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkUserTransformations();
