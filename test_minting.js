import fetch from 'node-fetch';

async function testRealMinting() {
  console.log('🧪 Testing Real Solana Token Minting...');

  try {
    // 1. Register test user
    console.log('1. Registering test user...');
    const registerResponse = await fetch('http://localhost:8090/api/collections/users/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `real-test-${Date.now()}@example.com`,
        password: 'test123',
        passwordConfirm: 'test123',
        name: 'RealTestUser'
      })
    });

    if (!registerResponse.ok) {
      throw new Error('User registration failed');
    }

    const userData = await registerResponse.json();
    const userToken = userData.access_token;

    console.log('✅ User registered');

    // 2. Test eat-particle endpoint (should call real blockchain)
    console.log('2. Testing real token minting...');

    const mintResponse = await fetch('http://localhost:8080/api/token/eat-particle', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        particle_location: [100, 200],
        particle_type: 'large'
      })
    });

    if (mintResponse.ok) {
      const result = await mintResponse.json();
      console.log('✅ Real minting successful!');
      console.log('📋 Transaction:', result.tx_signature);
      console.log('💰 New balance:', result.new_balance);
      console.log('🔗 View on Solana Explorer: https://explorer.solana.com/tx/' + result.tx_signature + '?cluster=devnet');
    } else {
      const error = await mintResponse.text();
      console.log('❌ Minting failed:', error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRealMinting();