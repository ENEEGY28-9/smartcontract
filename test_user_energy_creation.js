/**
 * Test script để kiểm tra logic tạo energy record cho user mới
 */

const PocketBase = require('pocketbase/cjs');

const POCKETBASE_URL = 'http://localhost:8090';
const pb = new PocketBase(POCKETBASE_URL);

async function testUserEnergyCreation() {
    console.log('🧪 TESTING USER ENERGY CREATION LOGIC');
    console.log('====================================');
    console.log();

    try {
        // Authenticate as admin
        await pb.admins.authWithPassword('admin@example.com', 'admin123456');
        console.log('✅ Admin authenticated');
        console.log();

        // Create a test user
        const testUserEmail = `test_energy_${Date.now()}@example.com`;
        console.log('1️⃣ CREATING TEST USER...');
        console.log(`   📧 Email: ${testUserEmail}`);

        const testUser = await pb.collection('users').create({
            email: testUserEmail,
            password: 'test123456',
            passwordConfirm: 'test123456'
        });

        console.log('✅ Test user created successfully');
        console.log(`   👤 ID: ${testUser.id}`);
        console.log(`   📧 Email: ${testUser.email}`);
        console.log();

        // Check if energy record was auto-created (this should work with our fix)
        console.log('2️⃣ CHECKING ENERGY RECORD AUTO-CREATION...');

        // Wait a moment for any async processes
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            const energyRecord = await pb.collection('energies').getFirstListItem(`user_id="${testUser.id}"`);
            console.log('✅ Energy record found!');
            console.log(`   ⚡ Points: ${energyRecord.points}`);
            console.log(`   👤 User ID: ${energyRecord.user_id}`);
            console.log(`   📅 Created: ${energyRecord.created}`);
            console.log(`   🔄 Last Updated: ${energyRecord.last_updated}`);
        } catch (error) {
            console.log('❌ No energy record found for test user');
            console.log('   This means auto-creation failed');

            // Try to create energy record manually to test the logic
            console.log('3️⃣ TESTING MANUAL ENERGY CREATION...');
            try {
                const manualEnergy = await pb.collection('energies').create({
                    user_id: testUser.id,
                    points: 100,
                    last_updated: new Date().toISOString()
                });
                console.log('✅ Manual energy creation successful');
                console.log(`   ⚡ Points: ${manualEnergy.points}`);
            } catch (manualError) {
                console.log('❌ Manual energy creation failed:', manualError.message);
            }
        }
        console.log();

        // Test with existing user
        console.log('4️⃣ TESTING WITH EXISTING USER...');

        const existingUsers = await pb.collection('users').getList(1, 5);
        if (existingUsers.items.length > 0) {
            const existingUser = existingUsers.items[0];
            console.log(`   Testing with existing user: ${existingUser.email}`);

            try {
                // This should either find existing or create new energy record
                const existingEnergyQuery = await pb.collection('energies').getList(1, 1, {
                    filter: `user_id = "${existingUser.id}"`
                });

                if (existingEnergyQuery.items.length > 0) {
                    console.log('   ✅ Existing energy record found');
                    console.log(`   ⚡ Points: ${existingEnergyQuery.items[0].points}`);
                } else {
                    console.log('   ⚠️  No energy record found - creating one...');
                    const newEnergyForExisting = await pb.collection('energies').create({
                        user_id: existingUser.id,
                        points: 50, // Less than new users
                        last_updated: new Date().toISOString()
                    });
                    console.log('   ✅ Created energy for existing user');
                    console.log(`   ⚡ Points: ${newEnergyForExisting.points}`);
                }
            } catch (error) {
                console.log('   ❌ Error with existing user energy:', error.message);
            }
        }
        console.log();

        // Summary
        console.log('🎯 TEST SUMMARY:');
        console.log('   • Test user creation: ✅');
        console.log('   • Energy auto-creation: Check above');
        console.log('   • Manual energy creation: Check above');
        console.log('   • Existing user handling: Check above');
        console.log();

        // Cleanup - delete test user
        console.log('🧹 CLEANING UP TEST DATA...');
        try {
            await pb.collection('energies').delete((await pb.collection('energies').getFirstListItem(`user_id="${testUser.id}"`)).id);
            await pb.collection('users').delete(testUser.id);
            console.log('✅ Test data cleaned up');
        } catch (cleanupError) {
            console.log('⚠️  Cleanup failed (may be OK if records don\'t exist):', cleanupError.message);
        }

        console.log();
        console.log('🎉 ENERGY CREATION TEST COMPLETE!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log();
        console.log('🔧 Possible issues:');
        console.log('   1. PocketBase not running');
        console.log('   2. Admin credentials incorrect');
        console.log('   3. Network issues');
        console.log('   4. Database schema issues');
    }
}

// Export for use as module
module.exports = { testUserEnergyCreation };

// Run if called directly
if (require.main === module) {
    testUserEnergyCreation().catch(console.error);
}







