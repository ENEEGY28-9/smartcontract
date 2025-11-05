// Test script to create SUI wallet and verify it works with PocketBase
const PocketBase = require('pocketbase/cjs');

const pb = new PocketBase('http://127.0.0.1:8090');

async function testSUIWallet() {
  try {
    console.log('🔍 Testing SUI wallet creation...');

    // Login as admin first
    await pb.admins.authWithPassword('admin@pocketbase.local', 'eneegy123456');

    // Create a test user
    const testUser = await pb.collection('users').create({
      email: `test-sui-${Date.now()}@test.com`,
      password: 'test123456',
      passwordConfirm: 'test123456'
    });

    console.log('✅ Test user created:', testUser.id);

    // Create SUI wallet data
    const suiWalletData = {
      user_id: testUser.id,
      address: 'sui' + Math.random().toString(36).substr(2, 20),
      private_key: 'mock_private_key_' + Math.random(),
      mnemonic: 'mock mnemonic for sui wallet',
      wallet_type: 'sui',
      network: 'sui',
      balance: 0,
      is_connected: false
    };

    console.log('📤 Creating SUI wallet with data:', suiWalletData);

    // Create the wallet
    const suiWallet = await pb.collection('wallets').create(suiWalletData);

    console.log('✅ SUI wallet created successfully:', suiWallet);

    // Verify the wallet was created
    const wallets = await pb.collection('wallets').getList(1, 50, {
      filter: `user_id = "${testUser.id}" && network = "sui"`
    });

    console.log('📋 Wallets found for user:', wallets.items.length);

    if (wallets.items.length > 0) {
      console.log('🎉 SUCCESS: SUI wallet creation works!');
      console.log('Wallet details:', wallets.items[0]);
    } else {
      console.log('❌ FAILURE: SUI wallet not found after creation');
    }

  } catch (error) {
    console.error('❌ Error testing SUI wallet:', error);
  }
}

testSUIWallet();



