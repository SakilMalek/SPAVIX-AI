import { Database } from './server/db';

async function checkAllTables() {
  try {
    console.log('🔍 Checking all database tables\n');
    console.log('═'.repeat(70));

    const result = await Database.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('\n📋 EXISTING TABLES:\n');
    (result.rows as any[]).forEach((row, i) => {
      console.log(`${i + 1}. ${row.table_name}`);
    });

    console.log('\n═'.repeat(70));
    console.log(`\nTotal tables: ${result.rows.length}\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAllTables();
