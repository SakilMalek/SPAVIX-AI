import { Database } from './server/db';

async function checkUserGenerations() {
  try {
    console.log('🔍 Checking transformations/generations for user1@gmail.com\n');
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
    console.log(`Plan: Starter (5 transformations/month limit)`);

    // Check generations table (where transformations are stored)
    console.log('\n🎨 GENERATIONS (Transformations):\n');
    const genResult = await Database.query(
      'SELECT id, room_type, style, created_at FROM generations WHERE user_id = $1 ORDER BY created_at DESC',
      [user.id]
    );

    if ((genResult.rows as any[]).length === 0) {
      console.log('❌ No generations/transformations found');
    } else {
      console.log(`✅ Found ${genResult.rows.length} transformations:\n`);
      (genResult.rows as any[]).forEach((g, i) => {
        console.log(`${i + 1}. ID: ${g.id}`);
        console.log(`   Room Type: ${g.room_type}`);
        console.log(`   Style: ${g.style}`);
        console.log(`   Created: ${g.created_at}\n`);
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
      console.log('\n⚠️  ISSUE: Transformations are NOT being tracked in usage_tracking table!');
      console.log('   This means quota enforcement is NOT working.\n');
    } else {
      console.log(`✅ Found ${usageResult.rows.length} usage records:\n`);
      (usageResult.rows as any[]).forEach((u, i) => {
        console.log(`${i + 1}. Feature: ${u.feature_key}`);
        console.log(`   Count: ${u.count}`);
        console.log(`   Period: ${u.period_start} to ${u.period_end}`);
        console.log(`   Created: ${u.created_at}\n`);
      });
    }

    // Check transformation_history
    console.log('📜 TRANSFORMATION HISTORY:\n');
    const histResult = await Database.query(
      `SELECT * FROM transformation_history 
       WHERE user_id = $1 
       ORDER BY created_at DESC LIMIT 10`,
      [user.id]
    );

    if ((histResult.rows as any[]).length === 0) {
      console.log('❌ No transformation history found');
    } else {
      console.log(`✅ Found ${histResult.rows.length} history records:\n`);
      (histResult.rows as any[]).forEach((h, i) => {
        console.log(`${i + 1}. Event: ${h.event_type}`);
        console.log(`   Details: ${h.details}`);
        console.log(`   Created: ${h.created_at}\n`);
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

checkUserGenerations();
