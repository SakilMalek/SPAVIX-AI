import fetch from 'node-fetch';

async function testChangePlanAPI() {
  try {
    console.log('🧪 Testing change-plan API endpoint\n');
    console.log('═'.repeat(70));

    // Get a valid token first (using test user)
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'sakil@gmail.com',
        password: 'password123',
      }),
    });

    if (!loginResponse.ok) {
      console.log('❌ Login failed');
      const text = await loginResponse.text();
      console.log('Response:', text);
      process.exit(1);
    }

    const loginData = await loginResponse.json() as any;
    const token = loginData.token;
    console.log(`\n✅ Got token: ${token.substring(0, 20)}...\n`);

    // Now test the change-plan endpoint
    console.log('🔄 Testing POST /api/subscriptions/change-plan\n');
    const changeResponse = await fetch('http://localhost:5000/api/subscriptions/change-plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ planName: 'pro' }),
    });

    console.log(`Status: ${changeResponse.status} ${changeResponse.statusText}\n`);
    console.log('Headers:', Object.fromEntries(changeResponse.headers.entries()));
    console.log('\n');

    const responseText = await changeResponse.text();
    console.log('Response Body:');
    console.log(responseText);

    if (changeResponse.ok) {
      console.log('\n✅ SUCCESS');
    } else {
      console.log('\n❌ FAILED');
    }

    console.log('\n═'.repeat(70));
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testChangePlanAPI();
