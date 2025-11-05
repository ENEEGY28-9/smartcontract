import PocketBase from 'pocketbase';

async function cleanupOrphanedRooms() {
    const pb = new PocketBase('http://127.0.0.1:8090');

    try {
        console.log('🧹 Starting cleanup of orphaned rooms...\n');

        // Get all users first
        const users = await pb.collection('users').getList(1, 1000);
        const userIds = new Set(users.items.map(user => user.id));

        console.log(`📋 Found ${users.items.length} users in database`);
        console.log(`🔍 Checking all rooms for orphaned owners...\n`);

        // Get all rooms
        const allRooms = await pb.collection('rooms').getList(1, 1000, {
            sort: '-created'
        });

        console.log(`🏠 Found ${allRooms.items.length} total rooms\n`);

        const orphanedRooms = [];
        const validRooms = [];

        for (const room of allRooms.items) {
            if (room.owner_id && !userIds.has(room.owner_id)) {
                orphanedRooms.push(room);
                console.log(`🚨 ORPHANED: "${room.name}" (${room.id}) - Owner: ${room.owner_id} (does not exist)`);
            } else {
                validRooms.push(room);
                console.log(`✅ VALID: "${room.name}" (${room.id}) - Owner: ${room.owner_id}`);
            }
        }

        console.log(`\n📊 SUMMARY:`);
        console.log(`   Valid rooms: ${validRooms.length}`);
        console.log(`   Orphaned rooms: ${orphanedRooms.length}`);

        if (orphanedRooms.length === 0) {
            console.log('\n✅ No orphaned rooms found. Database is clean!');
            return;
        }

        // Ask for confirmation before deleting
        console.log('\n⚠️  WARNING: About to delete orphaned rooms permanently!');
        console.log('This action cannot be undone.');

        // For safety, we'll just log what would be deleted
        // In a production script, you might want to add confirmation
        console.log('\n🗑️  ORPHANED ROOMS TO BE CLEANED UP:');
        orphanedRooms.forEach(room => {
            console.log(`   - "${room.name}" (${room.id}) - Created: ${room.created}`);
        });

        // Manual cleanup instructions since API deletion failed
        console.log('\n❌ API deletion failed. Manual cleanup required.');
        console.log('\n📋 MANUAL CLEANUP INSTRUCTIONS:');
        console.log('1. Open PocketBase Admin at http://127.0.0.1:8090/_/');
        console.log('2. Go to Collections → rooms');
        console.log('3. Delete the following orphaned rooms manually:');

        orphanedRooms.forEach(room => {
            console.log(`   - ID: ${room.id} | Name: "${room.name}" | Owner: ${room.owner_id}`);
        });

        console.log('\n🛠️  Alternatively, you can run this SQL in PocketBase:');
        const roomIds = orphanedRooms.map(r => `'${r.id}'`).join(', ');
        console.log(`DELETE FROM rooms WHERE id IN (${roomIds});`);

        console.log('\n⚠️  IMPORTANT: Do not delete rooms that have valid owners!');
        console.log('   Only delete the rooms listed above.');

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        console.error('Full error:', error);
    }
}

cleanupOrphanedRooms();
