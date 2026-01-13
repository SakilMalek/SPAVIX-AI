/**
 * Test Razorpay Service
 * Quick test to verify Razorpay service is working
 */

import * as dotenv from 'dotenv';
import { RazorpayService } from '../services/razorpay.js';

dotenv.config();

async function testRazorpayService() {
  try {
    console.log('🧪 Testing Razorpay Service...\n');

    // Test 1: Check if keys are configured
    console.log('Test 1: Checking Razorpay keys...');
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error('❌ Razorpay keys not configured in .env');
      process.exit(1);
    }

    console.log('✅ Razorpay keys found');
    console.log(`   Key ID: ${keyId.substring(0, 10)}...`);
    console.log(`   Key Secret: ${keySecret.substring(0, 10)}...\n`);

    // Test 2: Try to create or get a plan
    console.log('Test 2: Creating/Getting Razorpay plan...');
    try {
      const planId = await RazorpayService.createOrGetPlan('pro');
      console.log(`✅ Plan created/retrieved: ${planId}\n`);
    } catch (error) {
      console.error(`❌ Failed to create plan: ${(error as Error).message}\n`);
      throw error;
    }

    // Test 3: Try to create a customer
    console.log('Test 3: Creating Razorpay customer...');
    try {
      const customerId = await RazorpayService.createCustomer(
        'test-user-123',
        'test@example.com',
        'Test User'
      );
      console.log(`✅ Customer created: ${customerId}\n`);
    } catch (error) {
      console.error(`❌ Failed to create customer: ${(error as Error).message}\n`);
      throw error;
    }

    console.log('✅ All Razorpay service tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testRazorpayService();
