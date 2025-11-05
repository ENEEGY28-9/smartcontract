import PocketBase from 'pocketbase/cjs';

// PocketBase connection
const pb = new PocketBase('http://localhost:8090');

async function deleteAllRooms() {
    try {
        console.log('🔗 Connecting to PocketBase...');

        // First try to authenticate as admin (you'll need to set admin credentials)
        try {
            await pb.admins.authWithPassword('admin@example.com', 'admin123456');
            console.log('✅ Admin authenticated');
        } catch (adminError) {
            console.log('❌ Admin auth failed, trying regular user auth...');
            // If admin auth fails, try regular user
            await pb.collection('users').authWithPassword('working@example.com', 'working123456');
            console.log('✅ User authenticated');
        }

        console.log('📊 Fetching all rooms...');

        // Get all rooms (with pagination if needed)
        const records = await pb.collection('rooms').getFullList({
            sort: '-created',
        });

        console.log(`📋 Found ${records.length} rooms to delete`);

        if (records.length === 0) {
            console.log('✅ No rooms to delete');
            return;
        }

        // Delete rooms in batches to avoid overwhelming the server
        const batchSize = 100;
        let deletedCount = 0;

        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            console.log(`🗑️ Deleting batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(records.length/batchSize)} (${batch.length} rooms)...`);

            // Delete each room in the batch
            const deletePromises = batch.map(room =>
                pb.collection('rooms').delete(room.id).catch(error => {
                    console.error(`❌ Failed to delete room ${room.id}:`, error.message);
                    return null;
                })
            );

            const results = await Promise.all(deletePromises);
            const successfulDeletes = results.filter(result => result !== null).length;
            deletedCount += successfulDeletes;

            console.log(`✅ Deleted ${successfulDeletes}/${batch.length} rooms in this batch`);

            // Small delay between batches to be gentle on the server
            if (i + batchSize < records.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        console.log(`🎉 Successfully deleted ${deletedCount}/${records.length} rooms`);
        console.log('✅ All rooms data cleared!');

    } catch (error) {
        console.error('❌ Error deleting rooms:', error);
        console.log('\n💡 Make sure:');
        console.log('1. PocketBase is running on http://localhost:8090');
        console.log('2. You have correct admin credentials');
        console.log('3. The rooms collection exists');
    }
}

// Alternative method using direct database access (if you have admin access)
async function deleteAllRoomsDirect() {
    try {
        console.log('🔗 Connecting to PocketBase as admin...');

        // This requires admin authentication
        await pb.admins.authWithPassword('admin@example.com', 'admin123456');

        console.log('📊 Deleting all rooms directly...');

        // Use PocketBase admin API to truncate collection
        // Note: This requires admin privileges
        const result = await pb.send('/api/admins/collections/rooms/truncate', {
            method: 'POST'
        });

        console.log('✅ All rooms truncated successfully:', result);

    } catch (error) {
        console.error('❌ Direct truncate failed:', error.message);
        console.log('💡 Falling back to individual deletion method...');
        await deleteAllRooms();
    }
}

// Run the deletion
console.log('🚨 WARNING: This will delete ALL rooms data!');
console.log('Starting deletion in 3 seconds... (Ctrl+C to cancel)');

setTimeout(() => {
    deleteAllRooms();
}, 3000);
