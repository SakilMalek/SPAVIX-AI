import { Database } from './server/db';

async function debugMigration() {
  try {
    console.log('🔍 Checking database state...\n');

    // Check what tables exist
    const result = await Database.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('📊 Existing tables:');
    (result.rows as any[]).forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    console.log('\n🔍 Checking users table columns:');
    const usersResult = await Database.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position;
    `);

    (usersResult.rows as any[]).forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

    console.log('\n✅ Done');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugMigration();
