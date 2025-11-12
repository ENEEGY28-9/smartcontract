/**
 * Fix energy authentication issues by clearing cache and re-syncing
 */

const PocketBase = require('pocketbase/cjs');

const POCKETBASE_URL = 'http://localhost:8090';
const pb = new PocketBase(POCKETBASE_URL);

async function fixEnergyAuth() {
    console.log('🔧 FIXING ENERGY AUTH ISSUES');
    console.log('=============================');
    console.log();

    try {
        // Authenticate as admin
        await pb.admins.authWithPassword('admin@example.com', 'admin123456');
        console.log('✅ Admin authenticated');
        console.log();

        // Get users
        const fitUser = await pb.collection('users').getFirstListItem('email="fit@eneegy.com"');
        const adminUser = await pb.collection('users').getFirstListItem('email="admin@eneegy.com"');

        console.log('👤 FIT USER:', fitUser.email, '(ID:', fitUser.id, ')');
        console.log('👤 ADMIN USER:', adminUser.email, '(ID:', adminUser.id, ')');
        console.log();

        // Check current energy records
        console.log('🔍 CURRENT ENERGY RECORDS:');

        try {
            const fitEnergy = await pb.collection('energies').getFirstListItem(`user_id="${fitUser.id}"`);
            console.log('✅ Fit user energy:', fitEnergy.points, 'points');
        } catch (error) {
            console.log('❌ Fit user has no energy record');
        }

        try {
            const adminEnergy = await pb.collection('energies').getFirstListItem(`user_id="${adminUser.id}"`);
            console.log('✅ Admin user energy:', adminEnergy.points, 'points');
        } catch (error) {
            console.log('❌ Admin user has no energy record');
        }
        console.log();

        // Create energy records if missing
        console.log('🔧 CREATING MISSING ENERGY RECORDS:');

        try {
            await pb.collection('energies').getFirstListItem(`user_id="${fitUser.id}"`);
            console.log('✅ Fit user already has energy record');
        } catch (error) {
            const newFitEnergy = await pb.collection('energies').create({
                user_id: fitUser.id,
                points: 100 // Default starting energy
            });
            console.log('✅ Created energy record for fit user:', newFitEnergy.points, 'points');
        }

        try {
            await pb.collection('energies').getFirstListItem(`user_id="${adminUser.id}"`);
            console.log('✅ Admin user already has energy record');
        } catch (error) {
            const newAdminEnergy = await pb.collection('energies').create({
                user_id: adminUser.id,
                points: 1000 // Admin starting energy
            });
            console.log('✅ Created energy record for admin user:', newAdminEnergy.points, 'points');
        }
        console.log();

        // Verify final state
        console.log('🎯 FINAL VERIFICATION:');

        const finalFitEnergy = await pb.collection('energies').getFirstListItem(`user_id="${fitUser.id}"`);
        const finalAdminEnergy = await pb.collection('energies').getFirstListItem(`user_id="${adminUser.id}"`);

        console.log('✅ Fit user energy:', finalFitEnergy.points, 'points');
        console.log('✅ Admin user energy:', finalAdminEnergy.points, 'points');
        console.log();

        console.log('🎉 ENERGY AUTH ISSUES FIXED!');
        console.log('💡 Next steps:');
        console.log('   1. Hard refresh browser (Ctrl+Shift+R)');
        console.log('   2. Login as fit@eneegy.com');
        console.log('   3. Check that energy shows 100 points (not admin\'s points)');
        console.log('   4. Login as admin@eneegy.com');
        console.log('   5. Check that energy shows 1000 points');

    } catch (error) {
        console.error('❌ Fix failed:', error.message);
    }
}

// Export for use as module
module.exports = { fixEnergyAuth };

// Run if called directly
if (require.main === module) {
    fixEnergyAuth().catch(console.error);
}







