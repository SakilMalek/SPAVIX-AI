/**
 * Run subscription tables migration
 * Usage: npx tsx server/scripts/run-subscription-migration.ts
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 Starting subscription tables migration...');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../migrations/002_add_subscription_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Execute the migration
    await pool.query(migrationSQL);

    console.log('✅ Subscription tables created successfully!');
    console.log('✅ Default plans seeded (Starter, Pro, Business)');
    console.log('✅ Triggers created for auto-assignment');
    console.log('✅ Indexes created for performance');

    // Verify the migration
    const result = await pool.query(`
      SELECT name, display_name, price, billing_cycle 
      FROM subscription_plans 
      ORDER BY price ASC
    `);

    console.log('\n📊 Available subscription plans:');
    result.rows.forEach((plan) => {
      console.log(`  - ${plan.display_name}: $${plan.price}/${plan.billing_cycle}`);
    });

    console.log('\n🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
