// Create a user for testing wallet functionality
import PocketBase from 'pocketbase';

const POCKETBASE_URL = 'http://localhost:8090';
const pb = new PocketBase(POCKETBASE_URL);

async function createTestUser() {
    console.log('🚀 Creating test user for wallet testing...');

    try {
        // Create user with simple credentials
        const userRecord = await pb.collection('users').create({
            email: 'walletuser@example.com',
            password: 'wallet123456',
            passwordConfirm: 'wallet123456',
            name: 'Wallet Test User'
        });
        console.log('✅ Test user created:', userRecord.email);

        // Test authentication
        await pb.collection('users').authWithPassword('walletuser@example.com', 'wallet123456');
        console.log('✅ Authentication successful');

        // Create some sample wallets for the user
        console.log('📝 Creating sample wallets...');

        const wallets = [
            {
                user_id: pb.authStore.model.id,
                address: '0x742d35Cc6635C0532E3cC7c6d5d0E7d5f8B0c8e8',
                wallet_type: 'metamask',
                network: 'ethereum',
                balance: 1.5,
                is_connected: true
            },
            {
                user_id: pb.authStore.model.id,
                address: '57arMrLe8LHfzn7c0yUu6KGhxLQ6nfP87mHTHpM2SGB',
                wallet_type: 'phantom',
                network: 'solana',
                balance: 2.3,
                is_connected: true
            }
        ];

        for (const wallet of wallets) {
            const walletRecord = await pb.collection('wallets').create(wallet);
            console.log(`✅ Created ${wallet.network} wallet:`, walletRecord.address);
        }

        console.log('\n🎉 Test user and wallets created successfully!');
        console.log('\n📋 LOGIN CREDENTIALS FOR WALLET TEST:');
        console.log('Email: walletuser@example.com');
        console.log('Password: wallet123456');
        console.log('\n🔗 Open: http://localhost:5173/wallet-test');
        console.log('💡 Use the credentials above to login');

    } catch (error) {
        console.error('❌ Failed:', error.message);
        console.error('Error details:', error);
    }
}

createTestUser();
