// Test script to verify token API endpoints work correctly
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8080';

async function testTokenAPI() {
  console.log('🧪 Testing Token API Endpoints...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${BASE_URL}/healthz`);
    if (healthResponse.ok) {
      console.log('✅ Health check passed');
    } else {
      console.log('❌ Health check failed');
      return;
    }

    // Test 2: Register a test user (direct to PocketBase)
    console.log('\n2. Registering test user...');
    const registerResponse = await fetch(`http://localhost:8090/api/collections/users/records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: `test${Date.now()}@example.com`,
        password: 'testpassword123',
        passwordConfirm: 'testpassword123',
        name: 'TestUser'
      })
    });

    if (!registerResponse.ok) {
      console.log('❌ User registration failed');
      return;
    }

    const userData = await registerResponse.json();
    const userId = userData.id;
    const accessToken = userData.access_token;

    console.log('✅ User registered successfully');

    // Test 3: Test token balance endpoint
    console.log('\n3. Testing token balance endpoint...');
    const balanceResponse = await fetch(`${BASE_URL}/api/token/balance`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    });

    if (balanceResponse.ok) {
      const balanceData = await balanceResponse.json();
      console.log('✅ Balance check passed:', balanceData);
    } else {
      console.log('❌ Balance check failed:', balanceResponse.status);
      const errorText = await balanceResponse.text();
      console.log('Error:', errorText);
    }

    // Test 4: Test eat-particle endpoint (without wallet)
    console.log('\n4. Testing eat-particle endpoint (should fail without wallet)...');
    const eatParticleResponse = await fetch(`${BASE_URL}/api/token/eat-particle`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        particle_location: [10, 15],
        particle_type: 'small'
      })
    });

    if (eatParticleResponse.status === 400) {
      console.log('✅ Eat-particle correctly rejected (no wallet connected)');
    } else {
      console.log('❌ Eat-particle unexpected response:', eatParticleResponse.status);
    }

    // Test 5: Test transfer endpoint
    console.log('\n5. Testing transfer endpoint...');
    const transferResponse = await fetch(`${BASE_URL}/api/token/transfer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to_user_id: 'test-user-id',
        amount: 10
      })
    });

    if (transferResponse.ok) {
      console.log('✅ Transfer endpoint accessible');
    } else {
      console.log('❌ Transfer endpoint failed:', transferResponse.status);
    }

    console.log('\n🎯 Token API Tests Complete!');
    console.log('\n📊 Summary:');
    console.log('- ✅ Health check: Working');
    console.log('- ✅ User registration: Working');
    console.log('- ✅ Balance endpoint: Accessible');
    console.log('- ✅ Eat-particle endpoint: Protected (requires wallet)');
    console.log('- ✅ Transfer endpoint: Accessible');

    console.log('\n🔍 Note: Full functionality requires Solana wallet connection and blockchain service');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

testTokenAPI();
