/**
 * Debug authentication and energy loading issues
 */

const PocketBase = require('pocketbase/cjs');

const POCKETBASE_URL = 'http://localhost:8090';
const pb = new PocketBase(POCKETBASE_URL);

async function debugAuthEnergy() {
    console.log('🔍 DEBUGGING AUTH & ENERGY LOADING');
    console.log('===================================');
    console.log();

    try {
        // Authenticate as admin to inspect
        console.log('1️⃣ AUTHENTICATING AS ADMIN...');
        await pb.admins.authWithPassword('admin@example.com', 'admin123456');
        console.log('✅ Admin authenticated');
        console.log();

        // Get all users
        console.log('2️⃣ GETTING ALL USERS...');
        const allUsers = await pb.collection('users').getFullList({
            fields: 'id,email,created,updated'
        });

        console.log(`📊 Found ${allUsers.length} users:`);
        allUsers.forEach(user => {
            console.log(`   👤 ${user.email} (ID: ${user.id})`);
        });
        console.log();

        // Get all energy records
        console.log('3️⃣ GETTING ALL ENERGY RECORDS...');
        const allEnergy = await pb.collection('energies').getFullList({
            fields: 'id,user_id,points,created,updated',
            sort: '-updated'
        });

        console.log(`⚡ Found ${allEnergy.length} energy records:`);
        allEnergy.forEach(energy => {
            const userEmail = allUsers.find(u => u.id === energy.user_id)?.email || 'UNKNOWN';
            console.log(`   🔋 ${userEmail}: ${energy.points} points (ID: ${energy.id})`);
        });
        console.log();

        // Check for potential issues
        console.log('4️⃣ ANALYZING FOR ISSUES...');

        // Check for users without energy records
        const usersWithoutEnergy = allUsers.filter(user =>
            !allEnergy.some(energy => energy.user_id === user.id)
        );

        if (usersWithoutEnergy.length > 0) {
            console.log('⚠️  USERS WITHOUT ENERGY RECORDS:');
            usersWithoutEnergy.forEach(user => {
                console.log(`   ❌ ${user.email} has no energy record`);
            });
        } else {
            console.log('✅ All users have energy records');
        }

        // Check for orphaned energy records
        const orphanedEnergy = allEnergy.filter(energy =>
            !allUsers.some(user => user.id === energy.user_id)
        );

        if (orphanedEnergy.length > 0) {
            console.log('⚠️  ORPHANED ENERGY RECORDS:');
            orphanedEnergy.forEach(energy => {
                console.log(`   ❌ Energy record ${energy.id} has invalid user_id: ${energy.user_id}`);
            });
        } else {
            console.log('✅ No orphaned energy records');
        }

        // Check for duplicate energy records per user
        const userEnergyCounts = {};
        allEnergy.forEach(energy => {
            if (!userEnergyCounts[energy.user_id]) {
                userEnergyCounts[energy.user_id] = 0;
            }
            userEnergyCounts[energy.user_id]++;
        });

        const duplicateUsers = Object.keys(userEnergyCounts).filter(userId =>
            userEnergyCounts[userId] > 1
        );

        if (duplicateUsers.length > 0) {
            console.log('⚠️  USERS WITH MULTIPLE ENERGY RECORDS:');
            duplicateUsers.forEach(userId => {
                const userEmail = allUsers.find(u => u.id === userId)?.email || 'UNKNOWN';
                console.log(`   ❌ ${userEmail} has ${userEnergyCounts[userId]} energy records`);
            });
        } else {
            console.log('✅ No users have multiple energy records');
        }

        console.log();

        // Specific check for the reported issue
        console.log('5️⃣ CHECKING SPECIFIC USERS...');

        const fitUser = allUsers.find(u => u.email === 'fit@eneegy.com');
        const adminUser = allUsers.find(u => u.email === 'admin@eneegy.com');

        if (fitUser) {
            console.log(`👤 FIT USER: ${fitUser.email} (ID: ${fitUser.id})`);
            const fitEnergy = allEnergy.filter(e => e.user_id === fitUser.id);
            console.log(`   ⚡ Energy records: ${fitEnergy.length}`);
            fitEnergy.forEach(e => console.log(`      ${e.points} points (ID: ${e.id})`));
        } else {
            console.log('❌ fit@eneegy.com user not found');
        }

        if (adminUser) {
            console.log(`👤 ADMIN USER: ${adminUser.email} (ID: ${adminUser.id})`);
            const adminEnergy = allEnergy.filter(e => e.user_id === adminUser.id);
            console.log(`   ⚡ Energy records: ${adminEnergy.length}`);
            adminEnergy.forEach(e => console.log(`      ${e.points} points (ID: ${e.id})`));
        } else {
            console.log('❌ admin@eneegy.com user not found');
        }

        console.log();

        // Recommendations
        console.log('💡 RECOMMENDATIONS:');
        if (usersWithoutEnergy.length > 0) {
            console.log('   • Create missing energy records for users');
        }
        if (orphanedEnergy.length > 0) {
            console.log('   • Remove orphaned energy records');
        }
        if (duplicateUsers.length > 0) {
            console.log('   • Consolidate duplicate energy records');
        }
        console.log('   • Check browser console for auth debug logs');
        console.log('   • Hard refresh page (Ctrl+Shift+R) to clear cache');

    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    }
}

// Export for use as module
module.exports = { debugAuthEnergy };

// Run if called directly
if (require.main === module) {
    debugAuthEnergy().catch(console.error);
}







