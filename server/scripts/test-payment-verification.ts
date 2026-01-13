import dotenv from 'dotenv';
import { RazorpayService } from '../services/razorpay.js';
import { logger } from '../utils/logger.js';

dotenv.config();

async function testPaymentVerification() {
  try {
    console.log('🧪 TESTING PAYMENT VERIFICATION\n');

    // Use a test payment link ID (you would replace this with an actual one)
    const testPaymentLinkId = 'plink_S2ddZdqppANq6o'; // From the debug script output

    console.log(`Step 1: Fetching payment link status for ${testPaymentLinkId}...`);
    
    try {
      const paymentLink = await RazorpayService.getPaymentLinkStatus(testPaymentLinkId);
      
      console.log('✅ Payment link fetched successfully');
      console.log('Payment Link Details:');
      console.log(`  - ID: ${(paymentLink as any).id}`);
      console.log(`  - Status: ${(paymentLink as any).status}`);
      console.log(`  - Amount: ${(paymentLink as any).amount}`);
      console.log(`  - Notes: ${JSON.stringify((paymentLink as any).notes)}`);
      
      if ((paymentLink as any).status === 'paid') {
        console.log('\n✅ Payment is PAID - Subscription should be activated');
      } else if ((paymentLink as any).status === 'issued') {
        console.log('\n⏳ Payment link is ISSUED but not yet paid');
      } else {
        console.log(`\n⚠️ Payment link status: ${(paymentLink as any).status}`);
      }
    } catch (error) {
      console.log('⚠️ Payment link not found or error fetching:', (error as Error).message);
      console.log('This is expected if the payment link ID is invalid or expired');
    }

    console.log('\n✅ PAYMENT VERIFICATION TEST COMPLETED');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testPaymentVerification();
