/**
 * Debug Checkout Flow
 * Simulates the checkout process to identify where it fails
 */

import * as dotenv from 'dotenv';
import { Database } from '../db.js';
import { RazorpayService } from '../services/razorpay.js';
import { logger } from '../utils/logger.js';

dotenv.config();

async function debugCheckout() {
  try {
    console.log('\n🧪 DEBUGGING CHECKOUT FLOW\n');

    // Step 1: Check environment
    console.log('Step 1: Checking environment variables...');
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!keyId || !keySecret) {
      console.error('❌ Razorpay keys not configured');
      process.exit(1);
    }
    console.log('✅ Razorpay keys found\n');

    // Step 2: Initialize database
    console.log('Step 2: Initializing database...');
    await Database.initializeDatabase();
    console.log('✅ Database connected\n');

    // Step 3: Create test user
    console.log('Step 3: Creating test user...');
    const testEmail = `test-${Date.now()}@example.com`;
    const userResult = await Database.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [testEmail, 'test_hash', 'Test User']
    );
    
    if (userResult.rows.length === 0) {
      throw new Error('Failed to create test user');
    }
    
    const userId = userResult.rows[0].id;
    console.log(`✅ Test user created: ${userId}\n`);

    // Step 4: Check if subscription record exists
    console.log('Step 4: Checking subscription record...');
    const subResult = await Database.query(
      'SELECT * FROM user_subscriptions WHERE user_id = $1',
      [userId]
    );
    
    if (subResult.rows.length === 0) {
      console.log('⚠️  No subscription record found, creating one...');
      const planResult = await Database.query(
        'SELECT id FROM subscription_plans WHERE name = $1',
        ['starter']
      );
      
      if (planResult.rows.length === 0) {
        throw new Error('No starter plan found in database');
      }
      
      const planId = planResult.rows[0].id;
      await Database.query(
        `INSERT INTO user_subscriptions (user_id, plan_id, current_period_end)
         VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
        [userId, planId]
      );
      console.log('✅ Subscription record created\n');
    } else {
      console.log('✅ Subscription record exists\n');
    }

    // Step 5: Test Razorpay customer creation
    console.log('Step 5: Testing Razorpay customer creation...');
    try {
      const customerId = await RazorpayService.createCustomer(
        userId,
        testEmail,
        'Test User'
      );
      console.log(`✅ Customer created: ${customerId}\n`);
    } catch (error) {
      console.error(`❌ Customer creation failed: ${(error as Error).message}\n`);
      throw error;
    }

    // Step 6: Test full subscription creation
    console.log('Step 6: Testing full subscription creation...');
    try {
      const { subscriptionId, shortUrl } = await RazorpayService.createSubscription({
        userId,
        planName: 'pro',
        email: testEmail,
        name: 'Test User',
      });
      console.log(`✅ Subscription created: ${subscriptionId}`);
      console.log(`✅ Short URL: ${shortUrl}\n`);
    } catch (error) {
      console.error(`❌ Subscription creation failed: ${(error as Error).message}\n`);
      console.error('Full error:', error);
      throw error;
    }

    console.log('✅ ALL TESTS PASSED!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  }
}

debugCheckout();
