import { Database } from './server/db';

async function checkLatestTransformation() {
  try {
    console.log('🔍 Checking latest transformation for user1@gmail.com\n');
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

    const userId = (userResult.rows as any[])[0].id;
    console.log(`\n👤 User: user1@gmail.com (ID: ${userId})\n`);

    // Check generations table
    console.log('🎨 CHECKING GENERATIONS TABLE:\n');
    const genResult = await Database.query(
      'SELECT id, room_type, style, created_at FROM generations WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5',
      [userId]
    );

    if ((genResult.rows as any[]).length === 0) {
      console.log('❌ No generations found');
    } else {
      console.log(`✅ Found ${genResult.rows.length} generation(s):\n`);
      (genResult.rows as any[]).forEach((g, i) => {
        console.log(`${i + 1}. ID: ${g.id}`);
        console.log(`   Room: ${g.room_type}`);
        console.log(`   Style: ${g.style}`);
        console.log(`   Created: ${g.created_at}\n`);
      });
    }

    // Check usage tracking
    console.log('📈 CHECKING USAGE TRACKING:\n');
    const usageResult = await Database.query(
      'SELECT feature_key, usage_count, period_start, period_end, created_at FROM usage_tracking WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    if ((usageResult.rows as any[]).length === 0) {
      console.log('❌ No usage tracking records');
    } else {
      console.log(`✅ Found ${usageResult.rows.length} usage record(s):\n`);
      (usageResult.rows as any[]).forEach((u, i) => {
        console.log(`${i + 1}. Feature: ${u.feature_key}`);
        console.log(`   Count: ${u.usage_count}`);
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

checkLatestTransformation();
