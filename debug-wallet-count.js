// Debug wallet counting issue
async function debugWalletCount() {
    console.log('🔍 Debugging wallet count issue...\n');

    const pbUrl = 'http://localhost:8090';
    const testEmail = `debug-wallet-${Date.now()}@example.com`;
    const testPassword = 'test123456';

    try {
        // Register and auth
        const registerResponse = await fetch(`${pbUrl}/api/collections/users/records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: testEmail,
                password: testPassword,
                passwordConfirm: testPassword,
                name: 'Debug User'
            })
        });

        const userData = await registerResponse.json();
        console.log('User created:', userData.id);

        const authResponse = await fetch(`${pbUrl}/api/collections/users/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                identity: testEmail,
                password: testPassword
            })
        });

        const authData = await authResponse.json();
        const token = authData.token;
        const userId = authData.record.id;
        console.log('User authenticated:', userId);

        // Create wallet
        const walletData = {
            address: `debug_${userId}_${Date.now()}`,
            private_key: `priv_${userId}`,
            wallet_type: 'generated',
            network: 'ethereum',
            balance: 0
        };

        // Add user_id to wallet data
        walletData.user_id = userId;
        console.log('Creating wallet with user_id:', userId);
        console.log('Wallet data:', JSON.stringify(walletData, null, 2));

        const createWalletResponse = await fetch(`${pbUrl}/api/collections/wallets/records`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(walletData)
        });

        if (createWalletResponse.ok) {
            const createdWallet = await createWalletResponse.json();
            console.log('✅ Wallet created:', createdWallet.id, 'user_id:', createdWallet.user_id);
        } else {
            console.log('❌ Wallet creation failed');
            return;
        }

        // Check with different queries
        console.log('\n🔍 Checking wallet queries...');

        // Query 1: All wallets for user
        const query1 = await fetch(`${pbUrl}/api/collections/wallets/records?filter=user_id="${userId}"`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (query1.ok) {
            const data1 = await query1.json();
            console.log('Query 1 (filter by user_id):', data1.items.length, 'wallets');
        }

        // Query 2: All wallets (no filter)
        const query2 = await fetch(`${pbUrl}/api/collections/wallets/records`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (query2.ok) {
            const data2 = await query2.json();
            console.log('Query 2 (all user wallets):', data2.items.length, 'wallets');
            if (data2.items.length > 0) {
                console.log('Wallet details:');
                data2.items.forEach((w, i) => {
                    console.log(`  ${i+1}. ID: ${w.id}, User: ${w.user_id}, Network: ${w.network}`);
                });
            }
        }

        // Query 3: Check if user_id is correct
        console.log('\n👤 User ID verification:');
        const userCheck = await fetch(`${pbUrl}/api/collections/users/records/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (userCheck.ok) {
            const user = await userCheck.json();
            console.log('User exists:', user.email, 'ID:', user.id);
        }

    } catch (error) {
        console.log('❌ Debug failed:', error.message);
    }
}

debugWalletCount();
