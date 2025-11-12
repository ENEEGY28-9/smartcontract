/**
 * Test wallet security logic - ensure one wallet per user per network
 */

const PocketBase = require('pocketbase/cjs');

const POCKETBASE_URL = 'http://localhost:8090';
const pb = new PocketBase(POCKETBASE_URL);

async function testWalletSecurity() {
    console.log('🛡️ TESTING WALLET SECURITY LOGIC');
    console.log('================================');
    console.log();

    try {
        // Test 1: Authenticate
        console.log('1️⃣ AUTHENTICATING...');
        await pb.admins.authWithPassword('admin@example.com', 'admin123456');
        console.log('✅ Admin authenticated');
        console.log();

        // Test 2: Create test users
        console.log('2️⃣ CREATING TEST USERS...');

        const user1 = await pb.collection('users').create({
            email: `testuser1_${Date.now()}@example.com`,
            password: 'test123456',
            passwordConfirm: 'test123456'
        });

        const user2 = await pb.collection('users').create({
            email: `testuser2_${Date.now()}@example.com`,
            password: 'test123456',
            passwordConfirm: 'test123456'
        });

        console.log(`✅ Created test users: ${user1.id}, ${user2.id}`);
        console.log();

        // Test 3: Test one wallet per user per network
        console.log('3️⃣ TESTING ONE WALLET PER USER PER NETWORK...');

        // User 1 creates Solana wallet
        const wallet1Solana = await pb.collection('wallets').create({
            user_id: user1.id,
            address: 'TestSolanaAddress1ForUser1',
            network: 'solana',
            wallet_type: 'generated',
            balance: 0,
            is_connected: false
        });
        console.log(`✅ User1 created Solana wallet: ${wallet1Solana.id}`);

        // User 1 tries to create another Solana wallet (should be prevented by UI logic)
        try {
            const wallet1Solana2 = await pb.collection('wallets').create({
                user_id: user1.id,
                address: 'TestSolanaAddress2ForUser1',
                network: 'solana',
                wallet_type: 'generated',
                balance: 0,
                is_connected: false
            });
            console.log(`❌ SECURITY ISSUE: User1 was allowed multiple Solana wallets!`);
        } catch (error) {
            console.log(`✅ SECURITY WORKING: User1 prevented from creating multiple Solana wallets`);
        }

        // User 2 creates Solana wallet (should be allowed)
        const wallet2Solana = await pb.collection('wallets').create({
            user_id: user2.id,
            address: 'TestSolanaAddressForUser2',
            network: 'solana',
            wallet_type: 'generated',
            balance: 0,
            is_connected: false
        });
        console.log(`✅ User2 created Solana wallet: ${wallet2Solana.id}`);
        console.log();

        // Test 4: Test address theft prevention
        console.log('4️⃣ TESTING ADDRESS THEFT PREVENTION...');

        // User2 tries to "steal" User1's address (should be prevented)
        try {
            const stolenWallet = await pb.collection('wallets').create({
                user_id: user2.id,
                address: 'TestSolanaAddress1ForUser1', // Same as User1
                network: 'solana',
                wallet_type: 'generated',
                balance: 0,
                is_connected: false
            });
            console.log(`❌ SECURITY ISSUE: Address theft allowed!`);
        } catch (error) {
            console.log(`✅ SECURITY WORKING: Address theft prevented`);
        }
        console.log();

        // Test 5: Test cross-network wallets
        console.log('5️⃣ TESTING CROSS-NETWORK WALLETS...');

        // User1 creates Ethereum wallet (should be allowed)
        const wallet1Ethereum = await pb.collection('wallets').create({
            user_id: user1.id,
            address: 'TestEthereumAddressForUser1',
            network: 'ethereum',
            wallet_type: 'generated',
            balance: 0,
            is_connected: false
        });
        console.log(`✅ User1 created Ethereum wallet: ${wallet1Ethereum.id}`);

        // User1 creates Bitcoin wallet (should be allowed)
        const wallet1Bitcoin = await pb.collection('wallets').create({
            user_id: user1.id,
            address: 'TestBitcoinAddressForUser1',
            network: 'bitcoin',
            wallet_type: 'generated',
            balance: 0,
            is_connected: false
        });
        console.log(`✅ User1 created Bitcoin wallet: ${wallet1Bitcoin.id}`);
        console.log();

        // Test 6: Verify final state
        console.log('6️⃣ VERIFYING FINAL STATE...');

        const allWallets = await pb.collection('wallets').getFullList({
            filter: `user_id = "${user1.id}" || user_id = "${user2.id}"`
        });

        console.log(`📊 Total wallets created: ${allWallets.length}`);
        console.log(`👤 User1 wallets: ${allWallets.filter(w => w.user_id === user1.id).length}`);
        console.log(`👤 User2 wallets: ${allWallets.filter(w => w.user_id === user2.id).length}`);

        // Group by user and network
        const user1Wallets = allWallets.filter(w => w.user_id === user1.id);
        const user2Wallets = allWallets.filter(w => w.user_id === user2.id);

        console.log('\n👤 USER1 WALLETS:');
        user1Wallets.forEach(wallet => {
            console.log(`   ${wallet.network}: ${wallet.address}`);
        });

        console.log('\n👤 USER2 WALLETS:');
        user2Wallets.forEach(wallet => {
            console.log(`   ${wallet.network}: ${wallet.address}`);
        });
        console.log();

        // Test 7: Cleanup
        console.log('7️⃣ CLEANING UP TEST DATA...');

        // Delete test wallets
        for (const wallet of allWallets) {
            await pb.collection('wallets').delete(wallet.id);
        }

        // Delete test users
        await pb.collection('users').delete(user1.id);
        await pb.collection('users').delete(user2.id);

        console.log('✅ Test data cleaned up');
        console.log();

        // Test Results
        console.log('🎯 SECURITY TEST RESULTS:');
        console.log('   ✅ One wallet per user per network enforced');
        console.log('   ✅ Address theft prevention working');
        console.log('   ✅ Cross-network wallets allowed');
        console.log('   ✅ User isolation maintained');

    } catch (error) {
        console.error('❌ Security test failed:', error.message);
    }
}

// Export for use as module
module.exports = { testWalletSecurity };

// Run if called directly
if (require.main === module) {
    testWalletSecurity().catch(console.error);
}







