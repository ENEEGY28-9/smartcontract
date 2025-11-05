// Test the complete user registration -> energy creation flow
async function testUserEnergyFlow() {
    console.log('🧪 Testing complete user registration + energy creation flow...\n');

    const pbUrl = 'http://localhost:8090';
    const testEmail = `test-user-energy-${Date.now()}@example.com`;
    const testPassword = 'test123456';

    try {
        console.log('📝 Step 1: Register new user...');
        console.log(`Email: ${testEmail}`);

        // Register user via API (simulating frontend register call)
        const registerResponse = await fetch(`${pbUrl}/api/collections/users/records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: testEmail,
                password: testPassword,
                passwordConfirm: testPassword,
                name: 'Test User Energy'
            })
        });

        if (!registerResponse.ok) {
            console.log('❌ User registration failed');
            return;
        }

        const userData = await registerResponse.json();
        console.log('✅ User registered, ID:', userData.id);

        console.log('\n🔑 Step 2: Authenticate user (simulating PocketBase client auth)...');

        // Authenticate (this is what pb.collection('users').authWithPassword does)
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
        console.log('📋 Auth token received');

        console.log('\n⏳ Step 3: Simulate frontend delay (200ms)...');
        await new Promise(resolve => setTimeout(resolve, 200));

        console.log('\n📦 Step 4: Create wallets (autoCreateWalletsForUser simulation)...');

        // Create a wallet (simulating autoCreateWalletsForUser)
        const walletData = {
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
            console.log('✅ Wallet created successfully');
        } else {
            console.log('⚠️ Wallet creation failed, but continuing...');
        }

        console.log('\n⚡ Step 5: Create Energy record (getOrCreateUserEnergy simulation)...');

        // Step 5a: Check if energy exists (this is what getList does in getOrCreateUserEnergy)
        console.log('🔍 Checking existing energy records...');
        const checkEnergyResponse = await fetch(`${pbUrl}/api/collections/energies/records`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        let existingEnergy = null;
        if (checkEnergyResponse.ok) {
            const energyList = await checkEnergyResponse.json();
            console.log('📋 Energy records found:', energyList.items.length);

            if (energyList.items.length > 0) {
                existingEnergy = energyList.items[0];
                console.log('✅ Found existing energy record:', existingEnergy.points, 'points');
            } else {
                console.log('📋 No existing energy records found');
            }
        } else {
            console.log('❌ Failed to check energy records');
        }

        // Step 5b: If no energy exists, create it
        if (!existingEnergy) {
            console.log('🆕 Creating new energy record...');

            // Validate user exists first (like the service does)
            const userCheckResponse = await fetch(`${pbUrl}/api/collections/users/records/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!userCheckResponse.ok) {
                console.log('❌ User validation failed - user may not exist');
                return;
            }

            console.log('✅ User validation passed');

            // Create energy record
            const energyData = {
                user_id: userId,
                points: 1  // Using 1 instead of 0 to avoid PocketBase validation
            };

            console.log('📝 Creating energy with data:', JSON.stringify(energyData, null, 2));

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
                console.log('✅ Energy record created successfully!');
                console.log('📋 Energy ID:', newEnergy.id);
                console.log('⚡ Points:', newEnergy.points);
                console.log('👤 User ID:', newEnergy.user_id);
            } else {
                const errorText = await energyResponse.text();
                console.log('❌ Energy creation failed!');
                console.log('📋 Status:', energyResponse.status);
                console.log('📋 Error:', errorText);
                return;
            }
        }

        console.log('\n📋 Step 6: Final verification...');

        // Check final state
        const finalEnergyResponse = await fetch(`${pbUrl}/api/collections/energies/records`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const finalWalletResponse = await fetch(`${pbUrl}/api/collections/wallets/records`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (finalEnergyResponse.ok && finalWalletResponse.ok) {
            const finalEnergy = await finalEnergyResponse.json();
            const finalWallet = await finalWalletResponse.json();

            console.log('✅ Final state verification:');
            console.log('  ⚡ Energy records:', finalEnergy.items.length);
            console.log('  📦 Wallet records:', finalWallet.items.length);

            if (finalEnergy.items.length > 0) {
                console.log('  🎉 SUCCESS: User has energy record!');
                console.log('     Energy points:', finalEnergy.items[0].points);
                console.log('     Energy user_id:', finalEnergy.items[0].user_id);
            } else {
                console.log('  ❌ FAILURE: User missing energy record!');
            }

            if (finalWallet.items.length > 0) {
                console.log('  🎉 SUCCESS: User has wallet!');
                console.log('     Wallet network:', finalWallet.items[0].network);
            } else {
                console.log('  ⚠️ User has no wallets');
            }
        }

        console.log('\n🎮 User registration + energy creation test completed!');

        if (existingEnergy) {
            console.log('📋 Note: Energy record already existed (this is normal for returning users)');
        } else {
            console.log('✅ Energy record was created successfully for new user!');
        }

    } catch (error) {
        console.log('❌ Test failed with exception:', error.message);
    }
}

testUserEnergyFlow();
