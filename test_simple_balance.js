import axios from 'axios';

const GATEWAY_URL = 'http://localhost:8080';

console.log('🧪 SIMPLE BALANCE TEST');
console.log('='.repeat(30));

// Step 1: Register user
console.log('\n📝 Step 1: Register user');
try {
    const registerResponse = await axios.post(`${GATEWAY_URL}/auth/register`, {
        username: 'testuser_balance',
        email: 'test_balance@example.com',
        password: 'password123'
    }, { timeout: 15000 });

    const userData = registerResponse.data;
    console.log('✅ Registered user:', userData.user.id);

    // Step 2: Create wallet
    console.log('\n🔑 Step 2: Create wallet');
    const walletResponse = await axios.post(`${GATEWAY_URL}/api/wallet/create`, {
        wallet_type: "generated",
        network: "solana"
    }, {
        headers: {
            'Authorization': `Bearer ${userData.access_token}`,
            'Content-Type': 'application/json'
        },
        timeout: 15000
    });

    console.log('✅ Wallet created:', walletResponse.data.wallet_address);

    // Step 3: Check balance (with shorter timeout first)
    console.log('\n💰 Step 3: Check balance (5s timeout)');
    try {
        const balanceResponse = await axios.get(`${GATEWAY_URL}/api/token/balance`, {
            headers: {
                'Authorization': `Bearer ${userData.access_token}`
            },
            timeout: 5000 // Shorter timeout first
        });

        console.log('✅ Balance check SUCCESS:');
        console.log('Game tokens:', balanceResponse.data.game_tokens);
        console.log('Wallet address:', balanceResponse.data.wallet_address);

    } catch (balanceError) {
        if (balanceError.code === 'ECONNABORTED') {
            console.log('⏰ Balance check TIMEOUT (5s) - trying with 30s timeout...');

            // Try again with longer timeout
            try {
                const balanceResponse2 = await axios.get(`${GATEWAY_URL}/api/token/balance`, {
                    headers: {
                        'Authorization': `Bearer ${userData.access_token}`
                    },
                    timeout: 30000 // Longer timeout
                });

                console.log('✅ Balance check SUCCESS (after retry):');
                console.log('Game tokens:', balanceResponse2.data.game_tokens);
                console.log('Wallet address:', balanceResponse2.data.wallet_address);

            } catch (balanceError2) {
                console.log('❌ Balance check FAILED even with 30s timeout:');
                console.log('Error:', balanceError2.message);
            }

        } else {
            console.log('❌ Balance check FAILED:');
            console.log('Status:', balanceError.response?.status);
            console.log('Data:', balanceError.response?.data);
        }
    }

} catch (error) {
    console.log('❌ Test failed at step:', error.message);
}

console.log('\n🏁 TEST COMPLETE');










