import { Database } from './server/db';

async function testUsageInsert() {
  try {
    console.log('🧪 Testing usage tracking insert\n');
    console.log('═'.repeat(70));

    const userId = '596af833-df6e-4cd5-a7aa-73ce11356b88'; // user1@gmail.com

    // Get user's subscription period
    const subResult = await Database.query(
      `SELECT current_period_start, current_period_end FROM user_subscriptions WHERE user_id = $1`,
      [userId]
    );

    if ((subResult.rows as any[]).length === 0) {
      console.log('❌ No subscription found');
      process.exit(1);
    }

    const { current_period_start, current_period_end } = (subResult.rows as any[])[0];
    console.log(`\n📅 Current Period: ${current_period_start} to ${current_period_end}\n`);

    // Try to insert usage
    console.log('Attempting to insert usage tracking...\n');
    const insertResult = await Database.query(
      `INSERT INTO usage_tracking (user_id, resource_type, count, period_start, period_end, created_at, updated_at)
       VALUES ($1, $2, 1, $3, $4, NOW(), NOW())
       ON CONFLICT (user_id, resource_type, period_start)
       DO UPDATE SET 
         count = usage_tracking.count + 1,
         updated_at = NOW()
       RETURNING *`,
      [userId, 'transformation', current_period_start, current_period_end]
    );

    console.log('✅ Insert successful!\n');
    const row = (insertResult.rows as any[])[0];
    console.log(`User ID: ${row.user_id}`);
    console.log(`Resource Type: ${row.resource_type}`);
    console.log(`Count: ${row.count}`);
    console.log(`Period: ${row.period_start} to ${row.period_end}\n`);

    console.log('═'.repeat(70));
    console.log('\n✅ TEST COMPLETE\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testUsageInsert();
