/**
 * Script để tạo energy records cho tất cả users chưa có
 */

const PocketBase = require('pocketbase/cjs');

const POCKETBASE_URL = 'http://localhost:8090';
const pb = new PocketBase(POCKETBASE_URL);

async function createEnergyForAllUsers() {
    console.log('⚡ CREATING ENERGY RECORDS FOR ALL USERS');
    console.log('=======================================');
    console.log();

    try {
        // Authenticate as admin
        await pb.admins.authWithPassword('admin@example.com', 'admin123456');
        console.log('✅ Admin authenticated');
        console.log();

        // Get all users
        const allUsers = await pb.collection('users').getFullList({
            fields: 'id,email,created'
        });
        console.log(`👥 Found ${allUsers.length} total users`);
        console.log();

        // Get all existing energy records
        const existingEnergy = await pb.collection('energies').getFullList({
            fields: 'user_id'
        });

        const usersWithEnergy = new Set(existingEnergy.map(e => e.user_id));
        console.log(`⚡ Found ${existingEnergy.length} existing energy records`);
        console.log();

        // Find users without energy records
        const usersNeedingEnergy = allUsers.filter(user =>
            !usersWithEnergy.has(user.id)
        );

        console.log(`🎯 ${usersNeedingEnergy.length} users need energy records:`);
        usersNeedingEnergy.forEach(user => {
            console.log(`   ❌ ${user.email} (ID: ${user.id})`);
        });
        console.log();

        if (usersNeedingEnergy.length === 0) {
            console.log('✅ All users already have energy records!');
            return;
        }

        // Create energy records for users without them
        console.log('🚀 CREATING ENERGY RECORDS...');

        let createdCount = 0;
        let failedCount = 0;

        for (const user of usersNeedingEnergy) {
            try {
                // Determine starting energy based on email
                let startingEnergy = 100; // Default

                if (user.email.includes('admin')) {
                    startingEnergy = 1000; // Admin gets more
                } else if (user.email.includes('test') || user.email.includes('demo')) {
                    startingEnergy = 50; // Test accounts get less
                }

                const energyData = {
                    user_id: user.id,
                    points: startingEnergy,
                    last_updated: new Date().toISOString()
                };

                const newEnergyRecord = await pb.collection('energies').create(energyData);
                console.log(`   ✅ Created ${startingEnergy} energy for ${user.email}`);

                createdCount++;
            } catch (error) {
                console.error(`   ❌ Failed to create energy for ${user.email}:`, error.message);
                failedCount++;
            }
        }

        console.log();
        console.log('📊 RESULTS:');
        console.log(`   ✅ Created: ${createdCount} energy records`);
        console.log(`   ❌ Failed: ${failedCount} energy records`);
        console.log(`   📈 Success rate: ${((createdCount / (createdCount + failedCount)) * 100).toFixed(1)}%`);
        console.log();

        // Final verification
        console.log('🎯 FINAL VERIFICATION:');

        const finalEnergyRecords = await pb.collection('energies').getFullList();
        const finalUsersWithEnergy = new Set(finalEnergyRecords.map(e => e.user_id));
        const stillMissing = allUsers.filter(user =>
            !finalUsersWithEnergy.has(user.id)
        );

        if (stillMissing.length === 0) {
            console.log('✅ SUCCESS: All users now have energy records!');
        } else {
            console.log(`⚠️  WARNING: ${stillMissing.length} users still missing energy records:`);
            stillMissing.forEach(user => {
                console.log(`   ❌ ${user.email}`);
            });
        }

        console.log();
        console.log('🎉 ENERGY SETUP COMPLETE!');
        console.log('💡 Users can now access energy features immediately after registration.');

    } catch (error) {
        console.error('❌ Script failed:', error.message);
        console.log();
        console.log('🔧 Troubleshooting:');
        console.log('   1. Make sure PocketBase is running: http://localhost:8090');
        console.log('   2. Check admin credentials');
        console.log('   3. Check network connectivity');
    }
}

// Export for use as module
module.exports = { createEnergyForAllUsers };

// Run if called directly
if (require.main === module) {
    createEnergyForAllUsers().catch(console.error);
}







