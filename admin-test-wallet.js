// Test wallet functionality with admin authentication
import PocketBase from 'pocketbase';

const POCKETBASE_URL = 'http://localhost:8090';
const pb = new PocketBase(POCKETBASE_URL);

async function testWithAdmin() {
    console.log('🧪 Testing wallet with admin authentication...');

    try {
        // Authenticate as admin
        const authData = await pb.admins.authWithPassword('admin@example.com', 'admin123456');
        console.log('✅ Admin authenticated:', authData.admin.email);

        // Create a test user through admin API
        console.log('Creating test user...');
        const userRecord = await pb.collection('users').create({
            email: 'walletuser@example.com',
            password: 'wallet123',
            passwordConfirm: 'wallet123',
            name: 'Wallet Test User'
        });
        console.log('✅ Test user created:', userRecord.id);

        // Authenticate as the new user
        await pb.collection('users').authWithPassword('walletuser@example.com', 'wallet123');
        console.log('✅ User authenticated');

        // Create wallets for the user
        console.log('Creating sample wallets...');

        const wallets = [
            {
                address: '0x742d35Cc6635C0532E3cC7c6d5d0E7d5f8B0c8e8',
                wallet_type: 'metamask',
                network: 'ethereum',
                balance: 0.5
            },
            {
                address: '57arMrLe8LHfzn7c0yUu6KGhxLQ6nfP87mHTHpM2SGB',
                wallet_type: 'phantom',
                network: 'solana',
                balance: 1.2
            },
            {
                address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
                wallet_type: 'bitcoin',
                network: 'bitcoin',
                balance: 0.05
            }
        ];

        for (const wallet of wallets) {
            const walletRecord = await pb.collection('wallets').create({
                user_id: pb.authStore.model.id,
                address: wallet.address,
                wallet_type: wallet.wallet_type,
                network: wallet.network,
                balance: wallet.balance,
                is_connected: true
            });
            console.log(`✅ Created ${wallet.network} wallet:`, walletRecord.address);
        }

        // Test retrieving wallets
        const userWallets = await pb.collection('wallets').getList(1, 10, {
            filter: `user_id = "${pb.authStore.model.id}"`
        });
        console.log(`✅ Retrieved ${userWallets.totalItems} wallets for user`);

        console.log('\n📋 User Credentials for Wallet Test:');
        console.log('Email: walletuser@example.com');
        console.log('Password: wallet123');
        console.log('\n🔗 Login to: http://localhost:5173/wallet-test');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Full error:', error);
    }
}

testWithAdmin();
