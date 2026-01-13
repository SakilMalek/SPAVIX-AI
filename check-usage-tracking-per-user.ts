import { Database } from './server/db';

async function checkUsageTracking() {
  try {
    console.log('🔍 Checking usage tracking per user\n');
    console.log('═'.repeat(70));

    // Get all users
    const usersResult = await Database.query(
      'SELECT id, email FROM users ORDER BY created_at DESC LIMIT 5'
    );

    console.log('\n👥 USERS AND THEIR USAGE:\n');
    
    for (const user of (usersResult.rows as any[])) {
      console.log(`\nUser: ${user.email} (ID: ${user.id})`);
      
      // Get usage for this user
      const usageResult = await Database.query(
        `SELECT resource_type, count, period_start, period_end 
         FROM usage_tracking 
         WHERE user_id = $1 
         ORDER BY created_at DESC`,
        [user.id]
      );

      if ((usageResult.rows as any[]).length === 0) {
        console.log('  No usage tracking records');
      } else {
        (usageResult.rows as any[]).forEach((u, i) => {
          console.log(`  ${i + 1}. Type: ${u.resource_type}, Count: ${u.count}`);
        });
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

checkUsageTracking();
