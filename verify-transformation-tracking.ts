import { Database } from './server/db';

async function verifyTracking() {
  try {
    console.log('✅ VERIFYING TRANSFORMATION TRACKING\n');
    console.log('═'.repeat(70));

    const userId = '596af833-df6e-4cd5-a7aa-73ce11356b88'; // user1@gmail.com

    // Check generations
    console.log('\n🎨 GENERATIONS:\n');
    const genResult = await Database.query(
      'SELECT COUNT(*) as count FROM generations WHERE user_id = $1',
      [userId]
    );
    console.log(`Total transformations: ${genResult.rows[0].count}`);

    // Check usage tracking
    console.log('\n📈 USAGE TRACKING:\n');
    const usageResult = await Database.query(
      'SELECT resource_type, count, period_start, period_end FROM usage_tracking WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    if ((usageResult.rows as any[]).length === 0) {
      console.log('❌ No usage tracking records');
    } else {
      console.log(`✅ Found ${usageResult.rows.length} usage record(s):\n`);
      (usageResult.rows as any[]).forEach((u, i) => {
        console.log(`${i + 1}. Type: ${u.resource_type}`);
        console.log(`   Count: ${u.count}`);
        console.log(`   Period: ${new Date(u.period_start).toLocaleDateString()} to ${new Date(u.period_end).toLocaleDateString()}\n`);
      });
    }

    console.log('═'.repeat(70));
    console.log('\n✅ VERIFICATION COMPLETE\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyTracking();
