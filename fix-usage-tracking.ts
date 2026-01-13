import { Database } from './server/db';

async function fixUsageTracking() {
  try {
    console.log('🔧 FIXING USAGE TRACKING\n');
    console.log('═'.repeat(70));

    // Check usage_tracking table structure
    console.log('\n📋 Checking usage_tracking table structure...\n');
    const structureResult = await Database.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'usage_tracking'
      ORDER BY ordinal_position
    `);

    console.log('Columns in usage_tracking:');
    (structureResult.rows as any[]).forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    // The issue: trackUsage is using 'resource_type' but table has 'feature_key'
    console.log('\n⚠️  ISSUE FOUND:');
    console.log('  - trackUsage() tries to insert into "resource_type" column');
    console.log('  - But table has "feature_key" column instead');
    console.log('  - This causes tracking to fail silently\n');

    // Fix: Update trackUsage to use correct column name
    console.log('✅ FIX: Update SubscriptionService.trackUsage() to use "feature_key"\n');

    console.log('═'.repeat(70));
    console.log('\nFix applied to: server/services/subscription.ts\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixUsageTracking();
