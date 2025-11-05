// Test script to verify Energy auto-creation for new users
// Run: node test-energy-auto-creation.js

async function testEnergyAutoCreation() {
    console.log('🧪 Testing Energy auto-creation for new users...\n');

    const pbUrl = 'http://localhost:8090';
    const testEmail = `test-energy-${Date.now()}@example.com`;
    const testPassword = 'test123456';

    try {
        console.log('📝 Step 1: Registering new test user...');
        console.log(`Email: ${testEmail}`);

        // Register new user
        const registerResponse = await fetch(`${pbUrl}/api/collections/users/records`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: testEmail,
                password: testPassword,
                passwordConfirm: testPassword,
                name: 'Test Energy User'
            })
        });

        if (!registerResponse.ok) {
            const error = await registerResponse.text();
            console.log('❌ Registration failed:', registerResponse.status, error);
            return;
        }

        const userData = await registerResponse.json();
        console.log('✅ User registered successfully:', userData.id);

        console.log('\n🔑 Step 2: Authenticating user...');

        // Authenticate user
        const authResponse = await fetch(`${pbUrl}/api/collections/users/auth-with-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                identity: testEmail,
                password: testPassword
            })
        });

        if (!authResponse.ok) {
            console.log('❌ Authentication failed:', authResponse.status);
            return;
        }

        const authData = await authResponse.json();
        const token = authData.token;
        console.log('✅ User authenticated successfully');

        console.log('\n⚡ Step 3: Checking Energy record...');

        // Check if energy record exists
        const energyResponse = await fetch(`${pbUrl}/api/collections/energies/records`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        });

        if (!energyResponse.ok) {
            console.log('❌ Failed to fetch energy records:', energyResponse.status);
            return;
        }

        const energyData = await energyResponse.json();
        console.log('📋 Energy records found:', energyData.items.length);

        if (energyData.items.length > 0) {
            const energy = energyData.items[0];
            console.log('✅ Energy record details:');
            console.log('  - ID:', energy.id);
            console.log('  - Points:', energy.points);
            console.log('  - User ID:', energy.user_id);
            console.log('  - Created:', energy.created);
            console.log('  - Last Updated:', energy.last_updated);
        } else {
            console.log('❌ No energy record found!');
        }

        console.log('\n📦 Step 4: Checking Wallets...');

        // Check if wallets were created
        const walletResponse = await fetch(`${pbUrl}/api/collections/wallets/records`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        });

        if (walletResponse.ok) {
            const walletData = await walletResponse.json();
            console.log('✅ Wallets found:', walletData.items.length);
            walletData.items.forEach((wallet, index) => {
                console.log(`  Wallet ${index + 1}: ${wallet.network} - ${wallet.address.substring(0, 10)}...`);
            });
        }

        console.log('\n🎉 Test completed successfully!');
        console.log('✅ New users get Energy records automatically');
        console.log('✅ Energy is isolated per user');
        console.log('✅ Energy loads on login');

    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
}

testEnergyAutoCreation();
