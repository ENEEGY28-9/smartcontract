// Test final user setup: 3 wallets + 1 energy per user
async function testFinalUserSetup() {
    console.log('🧪 Testing final user setup: 3 wallets + 1 energy per user...\n');

    const pbUrl = 'http://localhost:8090';
    const testEmail = `test-final-${Date.now()}@example.com`;
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
                name: 'Final Test User'
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

        console.log('\n📦 Step 4: Create 3 wallets (registration simulation)...');

        // Create 3 wallets (simulating autoCreateWalletsForUser)
        const walletNetworks = ['ethereum', 'solana', 'bitcoin'];
        let walletsCreated = 0;

        for (const network of walletNetworks) {
            try {
                let address;
                if (network === 'ethereum') {
                    // Generate mock Ethereum address
                    address = '0x' + Math.random().toString(16).substr(2, 40);
                } else if (network === 'solana') {
                    address = 'So' + Math.random().toString(36).substr(2, 40);
                } else if (network === 'bitcoin') {
                    address = '1' + Math.random().toString(36).substr(3, 39);
                }

                const walletData = {
                    user_id: userId,
                    address: address,
                    private_key: `priv_${network}_${userId}`,
                    wallet_type: 'generated',
                    network: network,
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
                    walletsCreated++;
                    console.log(`  ✅ Created ${network} wallet`);
                } else {
                    console.log(`  ❌ Failed to create ${network} wallet`);
                }
            } catch (error) {
                console.log(`  ❌ Error creating ${network} wallet:`, error.message);
            }
        }

        console.log(`📦 Wallets created: ${walletsCreated}/3`);

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
            console.log('  📦 Wallets:', walletsData.items.length, '(should be 3)');
            console.log('  ⚡ Energy records:', energyData.items.length, '(should be 1)');

            // Check wallet networks
            if (walletsData.items.length === 3) {
                const networks = walletsData.items.map(w => w.network).sort();
                console.log('  Wallet networks:', networks.join(', '));

                const expectedNetworks = ['bitcoin', 'ethereum', 'solana'];
                if (JSON.stringify(networks) === JSON.stringify(expectedNetworks)) {
                    console.log('  ✅ All 3 networks present: Ethereum, Solana, Bitcoin');
                } else {
                    console.log('  ❌ Wrong networks:', networks);
                }
            }

            if (energyData.items.length === 1) {
                console.log('  ✅ Energy points:', energyData.items[0].points);
                console.log('  ✅ Energy user_id:', energyData.items[0].user_id);
            }

            // Final success check
            if (walletsData.items.length === 3 && energyData.items.length === 1) {
                console.log('\n🎉 SUCCESS! User has exactly 3 wallets and 1 energy record!');
                console.log('✅ Logic: 1 user = 3 wallets (ETH, SOL, BTC) + 1 energy record');
            } else {
                console.log('\n❌ FAILURE! Wrong number of records created');
            }
        }

        console.log('\n🎮 Final user setup test completed!');

    } catch (error) {
        console.log('❌ Test failed with exception:', error.message);
    }
}

testFinalUserSetup();
