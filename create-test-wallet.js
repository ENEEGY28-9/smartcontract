import PocketBase from 'pocketbase';

async function createTestWallet() {
  const pb = new PocketBase('http://localhost:8090');

  try {
    console.log('🔄 Creating test wallet data...');

    // First, try to authenticate as admin
    try {
      await pb.admins.authWithPassword('admin@example.com', 'password123');
      console.log('✅ Authenticated as admin');
    } catch (adminError) {
      console.log('⚠️ Could not authenticate as admin, trying regular user auth');

      // Try to login with existing user
      try {
        await pb.collection('users').authWithPassword('test@example.com', 'testpassword123');
        console.log('✅ Logged in as test@example.com');
      } catch (userError) {
        console.log('❌ Could not login. Creating new user...');

        // Create new user
        const userData = {
          email: 'test@example.com',
          password: 'testpassword123',
          passwordConfirm: 'testpassword123'
        };

        const newUser = await pb.collection('users').create(userData);
        console.log('✅ Created user:', newUser.email);

        // Login with new user
        await pb.collection('users').authWithPassword('test@example.com', 'testpassword123');
        console.log('✅ Logged in with new user');
      }
    }

    // Get current user
    const currentUser = pb.authStore.model;
    console.log('👤 Current user:', currentUser.email, 'ID:', currentUser.id);

    // Check existing wallets
    const existingWallets = await pb.collection('wallets').getFullList({
      filter: `user_id = "${currentUser.id}"`
    });

    console.log(`📦 Found ${existingWallets.length} existing wallets`);

    // Create or update Ethereum wallet with balance 1.5
    const ethWalletData = {
      user_id: currentUser.id,
      address: '0x742d35Cc6F2a2A9a37A0E2F8Cb1b6b5a5F6b8c9D',
      private_key: 'encrypted_private_key_placeholder',
      mnemonic: 'test wallet mnemonic for demo purposes only',
      wallet_type: 'generated',
      network: 'ethereum',
      balance: 1.5,
      is_connected: true
    };

    let ethWallet;
    const existingEthWallet = existingWallets.find(w => w.network === 'ethereum');

    if (existingEthWallet) {
      console.log('🔄 Updating existing Ethereum wallet...');
      ethWallet = await pb.collection('wallets').update(existingEthWallet.id, ethWalletData);
      console.log('✅ Updated Ethereum wallet with balance 1.5');
    } else {
      console.log('➕ Creating new Ethereum wallet...');
      ethWallet = await pb.collection('wallets').create(ethWalletData);
      console.log('✅ Created Ethereum wallet with balance 1.5');
    }

    console.log('💰 Wallet details:', {
      network: ethWallet.network,
      balance: ethWallet.balance,
      address: ethWallet.address,
      type: typeof ethWallet.balance
    });

    // Create SOL wallet too
    const solWalletData = {
      user_id: currentUser.id,
      address: '7xKXtg2CW87ZdxtFg2xRq7pWkF4H3aA5g3w8j9K2L4M',
      private_key: 'encrypted_sol_private_key',
      mnemonic: 'solana wallet mnemonic for demo',
      wallet_type: 'generated',
      network: 'solana',
      balance: 0.75,
      is_connected: true
    };

    const existingSolWallet = existingWallets.find(w => w.network === 'solana');

    if (existingSolWallet) {
      await pb.collection('wallets').update(existingSolWallet.id, solWalletData);
      console.log('✅ Updated Solana wallet with balance 0.75');
    } else {
      await pb.collection('wallets').create(solWalletData);
      console.log('✅ Created Solana wallet with balance 0.75');
    }

    console.log('🎉 Test wallets created/updated successfully!');
    console.log('📱 Now login to http://localhost:5174/wallet-test with test@example.com');
    console.log('💰 You should see 1.5 ETH balance when selecting Ethereum network');

  } catch (error) {
    console.error('❌ Error creating test wallet:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure PocketBase is running: http://localhost:8090');
    console.log('2. Check if collections exist in PocketBase admin');
    console.log('3. Verify authentication setup');
  }
}

createTestWallet();
