/**
 * Run Razorpay Migration
 * Adds Razorpay support fields to database
 */

import { fileURLToPath } from 'url';
import path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { getPool } from '../db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const pool = getPool();

  try {
    console.log('🔄 Starting Razorpay migration...\n');

    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/003_add_razorpay_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Execute migration
    await pool.query(migrationSQL);

    console.log('✅ Razorpay fields added successfully!');
    console.log('✅ Indexes created for performance\n');

    console.log('📊 Razorpay Integration Ready:');
    console.log('  - Razorpay plan IDs: subscription_plans.razorpay_plan_id');
    console.log('  - Razorpay customer IDs: user_subscriptions.razorpay_customer_id');
    console.log('  - Razorpay subscription IDs: user_subscriptions.razorpay_subscription_id');
    console.log('\n🎉 Migration completed successfully!');

    await pool.end();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
