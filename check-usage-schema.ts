import { Database } from './server/db';

async function checkUsageSchema() {
  try {
    const result = await Database.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'usage_tracking'
      ORDER BY ordinal_position
    `);

    console.log('usage_tracking table columns:');
    (result.rows as any[]).forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUsageSchema();
