/**
 * Run Starter Plan Features Migration
 * Usage: npx tsx server/scripts/run-starter-features-migration.ts
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
    console.log('🔄 Starting Starter plan features migration...');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../migrations/003_add_starter_plan_features.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Execute the migration
    await pool.query(migrationSQL);

    console.log('✅ Starter plan features tables created successfully!');
    console.log('✅ Tutorials seeded (6 tutorials)');
    console.log('✅ Email campaigns seeded (2 campaigns)');
    console.log('✅ Triggers created for auto-creating email preferences');
    console.log('✅ Indexes created for performance');

    // Verify the migration
    const tutorialsResult = await pool.query(`
      SELECT COUNT(*) as count FROM tutorials
    `);

    const emailCampaignsResult = await pool.query(`
      SELECT COUNT(*) as count FROM email_campaigns
    `);

    console.log('\n📊 Migration verification:');
    console.log(`  - Tutorials: ${tutorialsResult.rows[0].count} records`);
    console.log(`  - Email Campaigns: ${emailCampaignsResult.rows[0].count} records`);

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
