// Test single wallet and energy creation for new users
async function testSingleWalletEnergy() {
    console.log('🧪 Testing single wallet + energy creation for new users...\n');

    const pbUrl = 'http://localhost:8090';
    const testEmail = `test-single-${Date.now()}@example.com`;
    const testPassword = 'test123456';

    try {
        console.log('📝 Step 1: Register new user...');
        console.log(`Email: ${testEmail}`);

        // Register user
        const registerResponse = await fetch(`${pbUrl}/api/collections/users/records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: testEmail,
                password: testPassword,
                passwordConfirm: testPassword,
                name: 'Single Test User'
            })
        });

        if (!registerResponse.ok) {
            console.log('❌ Registration failed');
            return;
        }

        const userData = await registerResponse.json();
        console.log('✅ User registered, ID:', userData.id);

        console.log('\n🔑 Step 2: Authenticate user...');

        // Authenticate
        const authResponse = await fetch(`${pbUrl}/api/collections/users/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                identity: testEmail,
                password: testPassword
            })
        });

        if (!authResponse.ok) {
            console.log('❌ Authentication failed');
            return;
        }

        const authData = await authResponse.json();
        const token = authData.token;
        const userId = authData.record.id;
        console.log('✅ User authenticated, user ID:', userId);

        console.log('\n⏳ Step 3: Simulate 200ms delay...');
        await new Promise(resolve => setTimeout(resolve, 200));

        console.log('\n📦 Step 4: Create single wallet (Ethereum only)...');

        // Create single Ethereum wallet
        const walletData = {
            user_id: userId,
            address: `eth_${userId}_${Date.now()}`,
            private_key: `priv_${userId}`,
            wallet_type: 'generated',
            network: 'ethereum',
            balance: 0
        };

        const walletResponse = await fetch(`${pbUrl}/api/collections/wallets/records`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(walletData)
        });

        if (walletResponse.ok) {
            console.log('✅ Single Ethereum wallet created');
        } else {
            console.log('❌ Wallet creation failed');
        }

        console.log('\n⚡ Step 5: Create energy record...');

        // Create energy record
        const energyData = {
            user_id: userId,
            points: 1
        };

        const energyResponse = await fetch(`${pbUrl}/api/collections/energies/records`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(energyData)
        });

        if (energyResponse.ok) {
            const newEnergy = await energyResponse.json();
            console.log('✅ Energy record created:', newEnergy.id, 'with', newEnergy.points, 'points');
        } else {
            const errorText = await energyResponse.text();
            console.log('❌ Energy creation failed:', errorText);
        }

        console.log('\n📋 Step 6: Final verification...');

        // Check final counts
        const [finalWallets, finalEnergy] = await Promise.all([
            fetch(`${pbUrl}/api/collections/wallets/records`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${pbUrl}/api/collections/energies/records`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);

        if (finalWallets.ok && finalEnergy.ok) {
            const walletsData = await finalWallets.json();
            const energyData = await finalEnergy.json();

            console.log('✅ FINAL RESULTS:');
            console.log('  📦 Wallets:', walletsData.items.length, '(should be 1)');
            console.log('  ⚡ Energy records:', energyData.items.length, '(should be 1)');

            if (walletsData.items.length === 1 && energyData.items.length === 1) {
                console.log('\n🎉 SUCCESS! User has exactly 1 wallet and 1 energy record!');
                console.log('✅ Logic: 1 user = 1 wallet + 1 energy record');
            } else {
                console.log('\n❌ FAILURE! Wrong number of records created');
            }

            if (walletsData.items.length > 0) {
                console.log('  Wallet network:', walletsData.items[0].network);
            }
            if (energyData.items.length > 0) {
                console.log('  Energy points:', energyData.items[0].points);
            }
        }

        console.log('\n🎮 Test completed!');

    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
}

testSingleWalletEnergy();
