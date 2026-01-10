// Quick script to run the sessions table migration
import 'dotenv/config';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log('🔄 Connecting to database...');
    
    // Read migration file
    const migrationPath = join(__dirname, 'server', 'migrations', '001_add_sessions_table.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    console.log('🔄 Running migration: 001_add_sessions_table.sql');
    
    // Execute migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify table exists
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'sessions'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Sessions table created successfully');
      
      // Check indexes
      const indexes = await pool.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'sessions'
      `);
      console.log(`✅ Created ${indexes.rows.length} indexes`);
    } else {
      console.error('❌ Sessions table was not created');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
