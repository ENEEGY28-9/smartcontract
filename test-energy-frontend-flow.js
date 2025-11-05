// Test Energy creation through frontend flow
// Simulate the registration and energy creation process

async function testEnergyFrontendFlow() {
    console.log('🧪 Testing Energy creation through frontend flow...\n');

    const pbUrl = 'http://localhost:8090';
    const testEmail = `test-energy-frontend-${Date.now()}@example.com`;
    const testPassword = 'test123456';

    try {
        console.log('📝 Step 1: Registering new user via API (simulating frontend)...');
        console.log(`Email: ${testEmail}`);

        // Register user
        const registerResponse = await fetch(`${pbUrl}/api/collections/users/records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: testEmail,
                password: testPassword,
                passwordConfirm: testPassword,
                name: 'Test Frontend User'
            })
        });

        if (!registerResponse.ok) {
            console.log('❌ Registration failed');
            return;
        }

        const userData = await registerResponse.json();
        console.log('✅ User registered:', userData.id);

        console.log('\n🔑 Step 2: Authenticating user...');

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
        console.log('✅ User authenticated, ID:', userId);

        console.log('\n⏳ Step 3: Simulating frontend delay (200ms)...');
        await new Promise(resolve => setTimeout(resolve, 200));

        console.log('\n📦 Step 4: Creating wallets (simulating autoCreateWalletsForUser)...');

        // Create wallets for all networks
        const networks = ['ethereum', 'solana', 'bitcoin'];
        let walletsCreated = 0;

        for (const network of networks) {
            try {
                const walletData = {
                    address: `${network}_${userId}_${Date.now()}`,
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

        console.log('\n⚡ Step 5: Creating Energy record (simulating getOrCreateUserEnergy)...');

        // Check existing energy
        const checkEnergyResponse = await fetch(`${pbUrl}/api/collections/energies/records`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        let existingEnergy = null;
        if (checkEnergyResponse.ok) {
            const energyData = await checkEnergyResponse.json();
            if (energyData.items.length > 0) {
                existingEnergy = energyData.items[0];
                console.log('📋 Found existing energy record:', existingEnergy.points, 'points');
            }
        }

        // Create energy if not exists
        if (!existingEnergy) {
            const energyData = {
                user_id: userId,
                points: 0,
                last_updated: new Date().toISOString()
            };

            console.log('🆕 Creating energy record with data:', {
                user_id: userId,
                points: 0
            });

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
                console.log('✅ Energy record created:', newEnergy.id);
            } else {
                const errorData = await energyResponse.text();
                console.log('❌ Failed to create energy:', energyResponse.status, errorData);
            }
        }

        console.log('\n📋 Step 6: Final verification...');

        // Final check
        const finalEnergyResponse = await fetch(`${pbUrl}/api/collections/energies/records`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (finalEnergyResponse.ok) {
            const finalEnergyData = await finalEnergyResponse.json();
            console.log('✅ Final energy records:', finalEnergyData.items.length);
            if (finalEnergyData.items.length > 0) {
                console.log('🎉 SUCCESS: User has energy record!');
                console.log('   Points:', finalEnergyData.items[0].points);
                console.log('   User ID:', finalEnergyData.items[0].user_id);
            }
        }

        console.log('\n🎮 Frontend flow test completed!');

    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
}

testEnergyFrontendFlow();
