// Test the exact flow that happens in the frontend
// This replicates what happens when a user registers

async function testEnergyExactFlow() {
    console.log('🧪 Testing exact Energy creation flow (frontend simulation)...\n');

    const pbUrl = 'http://localhost:8090';
    const testEmail = `test-exact-flow-${Date.now()}@example.com`;
    const testPassword = 'test123456';

    try {
        console.log('📝 Step 1: Register user via PocketBase client simulation...');

        // Register user
        const registerResponse = await fetch(`${pbUrl}/api/collections/users/records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: testEmail,
                password: testPassword,
                passwordConfirm: testPassword,
                name: 'Exact Flow Test'
            })
        });

        if (!registerResponse.ok) {
            console.log('❌ Registration failed');
            return;
        }

        const userData = await registerResponse.json();
        console.log('✅ User registered, ID:', userData.id);

        console.log('\n🔑 Step 2: Authenticate user...');

        // Authenticate (this is what PocketBase client does)
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
        console.log('✅ User authenticated, token received, user ID:', userId);

        console.log('\n⏳ Step 3: Frontend delay (200ms)...');
        await new Promise(resolve => setTimeout(resolve, 200));

        console.log('\n📦 Step 4: Create wallets (autoCreateWalletsForUser simulation)...');

        // Create wallets (this replicates autoCreateWalletsForUser)
        const walletData = {
            address: `eth_${userId}_${Date.now()}`,
            private_key: `priv_eth_${userId}`,
            wallet_type: 'generated',
            network: 'ethereum',
            balance: 0,
            user_id: userId
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
            console.log('✅ Wallet created');
        } else {
            console.log('❌ Wallet creation failed');
        }

        console.log('\n⚡ Step 5: Create Energy (getOrCreateUserEnergy simulation)...');

        // Check if energy exists (this is what getList does)
        console.log('🔍 Checking existing energy records...');
        const checkResponse = await fetch(`${pbUrl}/api/collections/energies/records`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        let existingEnergy = null;
        if (checkResponse.ok) {
            const energyList = await checkResponse.json();
            console.log('📋 Found energy records:', energyList.items.length);

            if (energyList.items.length > 0) {
                existingEnergy = energyList.items[0];
                console.log('✅ Existing energy found:', existingEnergy.points, 'points');
                return;
            }
        }

        // Validate user exists (this is the new validation we added)
        console.log('🔍 Validating user exists...');
        const userCheckResponse = await fetch(`${pbUrl}/api/collections/users/records/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!userCheckResponse.ok) {
            console.log('❌ User validation failed');
            return;
        }

        const validatedUser = await userCheckResponse.json();
        console.log('✅ User validation passed:', validatedUser.email);

        // Create energy record (this replicates the minimal data approach)
        console.log('📝 Creating energy record with minimal data...');

        const energyData = {
            user_id: userId,
            points: 0
        };

        console.log('🔄 Data to send:', JSON.stringify(energyData, null, 2));

        const energyResponse = await fetch(`${pbUrl}/api/collections/energies/records`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(energyData)
        });

        console.log('📡 Energy creation response status:', energyResponse.status);

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

            // Try to parse error details
            try {
                const errorData = JSON.parse(errorText);
                if (errorData.data) {
                    console.log('📋 Validation errors:');
                    Object.keys(errorData.data).forEach(field => {
                        console.log(`  - ${field}: ${errorData.data[field].message}`);
                    });
                }
            } catch (parseError) {
                console.log('📋 Raw error response:', errorText);
            }
        }

        console.log('\n🎮 Test completed!');

    } catch (error) {
        console.log('❌ Test failed with exception:', error.message);
        console.log('Stack:', error.stack);
    }
}

testEnergyExactFlow();
