/**
 * Update subscription plan prices
 */

import * as dotenv from 'dotenv';
import { Database } from '../db.js';
import { logger } from '../utils/logger.js';

dotenv.config();

async function updatePrices() {
  try {
    console.log('\n💰 UPDATING SUBSCRIPTION PLAN PRICES\n');

    // Initialize database
    console.log('Connecting to database...');
    await Database.initializeDatabase();
    console.log('✅ Database connected\n');

    // Update Pro plan to 499
    console.log('Updating Pro plan to ₹499/month...');
    const proResult = await Database.query(
      'UPDATE subscription_plans SET price = 499.00, updated_at = NOW() WHERE name = $1 RETURNING *',
      ['pro']
    );
    
    if (proResult.rows.length > 0) {
      console.log(`✅ Pro plan updated: ₹${proResult.rows[0].price}/month\n`);
    }

    // Update Business plan to 999
    console.log('Updating Business plan to ₹999/month...');
    const businessResult = await Database.query(
      'UPDATE subscription_plans SET price = 999.00, updated_at = NOW() WHERE name = $1 RETURNING *',
      ['business']
    );
    
    if (businessResult.rows.length > 0) {
      console.log(`✅ Business plan updated: ₹${businessResult.rows[0].price}/month\n`);
    }

    // Show all plans
    console.log('Current subscription plans:');
    const allPlans = await Database.query('SELECT name, display_name, price FROM subscription_plans ORDER BY price');
    
    allPlans.rows.forEach((plan: any) => {
      console.log(`  - ${plan.display_name}: ₹${plan.price}/month`);
    });

    console.log('\n✅ PRICES UPDATED SUCCESSFULLY!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to update prices:', error);
    process.exit(1);
  }
}

updatePrices();
