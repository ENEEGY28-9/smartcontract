/**
 * Debug wallet authentication issues
 */

const PocketBase = require('pocketbase/cjs');

const POCKETBASE_URL = 'http://localhost:8090';
const pb = new PocketBase(POCKETBASE_URL);

async function debugWalletAuth() {
    console.log('🔍 DEBUGGING WALLET AUTHENTICATION');
    console.log('==================================');
    console.log();

    try {
        // Test 1: Check current auth state
        console.log('1️⃣ CHECKING CURRENT AUTH STATE:');
        console.log('   isValid:', pb.authStore.isValid);
        console.log('   hasToken:', !!pb.authStore.token);
        console.log('   hasModel:', !!pb.authStore.model);
        console.log('   modelEmail:', pb.authStore.model?.email || 'none');
        console.log();

        // Test 2: Try to authenticate as admin
        console.log('2️⃣ TESTING ADMIN AUTHENTICATION:');
        try {
            await pb.admins.authWithPassword('admin@eneegy.com', '12345678');
            console.log('✅ Admin authentication successful');
            console.log('   isValid after auth:', pb.authStore.isValid);
            console.log('   modelEmail:', pb.authStore.model?.email);
        } catch (error) {
            console.log('❌ Admin authentication failed:', error.message);
        }
        console.log();

        // Test 3: Try to authenticate as user
        console.log('3️⃣ TESTING USER AUTHENTICATION:');
        try {
            // First logout if logged in
            pb.authStore.clear();

            await pb.collection('users').authWithPassword('admin@eneegy.com', '12345678');
            console.log('✅ User authentication successful');
            console.log('   isValid after auth:', pb.authStore.isValid);
            console.log('   modelEmail:', pb.authStore.model?.email);
            console.log('   userId:', pb.authStore.model?.id);
        } catch (error) {
            console.log('❌ User authentication failed:', error.message);
        }
        console.log();

        // Test 4: Check auth persistence
        console.log('4️⃣ TESTING AUTH PERSISTENCE:');
        console.log('   Before refresh - isValid:', pb.authStore.isValid);
        console.log('   Before refresh - modelEmail:', pb.authStore.model?.email);

        // Create new instance to test persistence
        const pb2 = new PocketBase(POCKETBASE_URL);
        console.log('   New instance - isValid:', pb2.authStore.isValid);
        console.log('   New instance - modelEmail:', pb2.authStore.model?.email);
        console.log();

        // Test 5: Check for existing users
        console.log('5️⃣ CHECKING EXISTING USERS:');
        const users = await pb.collection('users').getList(1, 10);
        console.log(`Found ${users.items.length} users:`);
        users.items.forEach(user => {
            console.log(`   • ${user.email} (ID: ${user.id})`);
        });
        console.log();

    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    }
}

// Export for use as module
module.exports = { debugWalletAuth };

// Run if called directly
if (require.main === module) {
    debugWalletAuth().catch(console.error);
}







