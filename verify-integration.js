// Verify wallet integration without admin auth
import PocketBase from 'pocketbase';

const POCKETBASE_URL = 'http://localhost:8090';
const pb = new PocketBase(POCKETBASE_URL);

async function verifyIntegration() {
    console.log('🔍 Verifying wallet integration...');

    try {
        // Test 1: Check if collections exist (without auth)
        console.log('\n1️⃣ Checking collections...');
        const collectionsResponse = await fetch(`${POCKETBASE_URL}/api/collections`);
        const collectionsData = await collectionsResponse.json();
        console.log('Available collections:', collectionsData.items?.map(c => c.name) || 'Unable to fetch');

        // Test 2: Try to create a test user
        console.log('\n2️⃣ Testing user creation...');
        const testUser = {
            email: 'newuser' + Date.now() + '@example.com',
            password: 'verify123',
            passwordConfirm: 'verify123',
            name: 'Verify User'
        };

        const userResponse = await fetch(`${POCKETBASE_URL}/api/collections/users/records`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testUser)
        });

        if (userResponse.ok) {
            const user = await userResponse.json();
            console.log('✅ Test user created:', user.email);

            // Test 3: Authenticate the user
            console.log('\n3️⃣ Testing user authentication...');
            const authResponse = await fetch(`${POCKETBASE_URL}/api/collections/users/auth-with-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    identity: testUser.email,
                    password: testUser.password
                })
            });

            if (authResponse.ok) {
                const auth = await authResponse.json();
                console.log('✅ User authenticated');

                // Test 4: Create wallet for the user
                console.log('\n4️⃣ Testing wallet creation...');
                const walletData = {
                    user_id: auth.record.id,
                    address: '0x1234567890abcdef1234567890abcdef12345678',
                    wallet_type: 'metamask',
                    network: 'ethereum',
                    balance: 0.1,
                    is_connected: true
                };

                const walletResponse = await fetch(`${POCKETBASE_URL}/api/collections/wallets/records`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${auth.token}`
                    },
                    body: JSON.stringify(walletData)
                });

                if (walletResponse.ok) {
                    const wallet = await walletResponse.json();
                    console.log('✅ Wallet created:', wallet.address);

                    // Test 5: Retrieve wallets for the user
                    console.log('\n5️⃣ Testing wallet retrieval...');
                    const walletsResponse = await fetch(`${POCKETBASE_URL}/api/collections/wallets/records?filter=user_id="${auth.record.id}"`, {
                        headers: {
                            'Authorization': `Bearer ${auth.token}`
                        }
                    });

                    if (walletsResponse.ok) {
                        const wallets = await walletsResponse.json();
                        console.log(`✅ Retrieved ${wallets.totalItems} wallets`);
                        wallets.items.forEach(w => {
                            console.log(`  - ${w.network}: ${w.address} (Balance: ${w.balance})`);
                        });
                    }

                    console.log('\n🎉 Wallet integration is working perfectly!');
                    console.log('\n📋 Test Credentials:');
                    console.log('Email:', testUser.email);
                    console.log('Password:', testUser.password);
                    console.log('\n🔗 Use these credentials in the wallet test app');

                } else {
                    console.log('❌ Failed to create wallet');
                }

            } else {
                console.log('❌ Failed to authenticate user');
            }

        } else {
            console.log('❌ Failed to create test user');
            console.log('Response:', userResponse.status, await userResponse.text());
        }

    } catch (error) {
        console.error('❌ Verification failed:', error.message);
    }
}

verifyIntegration();
