import { Database } from './server/db';

async function checkSchema() {
  try {
    const result = await Database.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'user_subscriptions'
      ORDER BY ordinal_position
    `);

    console.log('user_subscriptions table columns:');
    (result.rows as any[]).forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSchema();
