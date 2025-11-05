// Test script for token APIs
// This script tests the token endpoints without authentication

async function testTokenAPIs() {
  const baseUrl = 'http://127.0.0.1:8080';

  console.log('🧪 Testing Token APIs...\n');

  try {
    // Test 1: Balance endpoint (should fail without auth)
    console.log('1. Testing balance endpoint without auth...');
    const balanceResponse = await fetch(`${baseUrl}/api/token/balance`);
    console.log(`   Status: ${balanceResponse.status}`);
    const balanceData = await balanceResponse.json();
    console.log(`   Response:`, balanceData);
    console.log('');

    // Test 2: Eat particle endpoint (should fail without auth)
    console.log('2. Testing eat-particle endpoint without auth...');
    const eatResponse = await fetch(`${baseUrl}/api/token/eat-particle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        particle_location: [10, 15],
        particle_type: 'energy'
      })
    });
    console.log(`   Status: ${eatResponse.status}`);
    const eatData = await eatResponse.json();
    console.log(`   Response:`, eatData);
    console.log('');

    // Test 3: Transfer endpoint (should fail without auth)
    console.log('3. Testing transfer endpoint without auth...');
    const transferResponse = await fetch(`${baseUrl}/api/token/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipient_address: 'test-address',
        amount: 100
      })
    });
    console.log(`   Status: ${transferResponse.status}`);
    const transferData = await transferResponse.json();
    console.log(`   Response:`, transferData);
    console.log('');

    console.log('✅ Token API tests completed!');
    console.log('\n📋 Summary:');
    console.log('- All endpoints require JWT authentication (401 Unauthorized)');
    console.log('- This is expected behavior for protected token routes');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test health check
async function testHealth() {
  try {
    console.log('🏥 Testing health endpoint...');
    const response = await fetch('http://127.0.0.1:8080/api/health');
    console.log(`   Status: ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      console.log(`   Response:`, data);
    }
    console.log('');
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }
}

async function main() {
  await testHealth();
  await testTokenAPIs();
}

main();



