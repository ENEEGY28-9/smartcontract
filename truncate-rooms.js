import PocketBase from 'pocketbase/cjs';

// PocketBase connection
const pb = new PocketBase('http://localhost:8090');

async function truncateRoomsCollection() {
    try {
        console.log('🔗 Connecting to PocketBase...');

        // Try admin auth first
        try {
            await pb.admins.authWithPassword('admin@example.com', 'admin123456');
            console.log('✅ Admin authenticated');
        } catch (adminError) {
            console.log('❌ Admin auth failed, trying user auth...');
            await pb.collection('users').authWithPassword('working@example.com', 'working123456');
            console.log('✅ User authenticated');
        }

        console.log('📊 Checking current room count...');
        const records = await pb.collection('rooms').getFullList();
        console.log(`📋 Found ${records.length} rooms to delete`);

        // Method 1: Try truncate if admin
        try {
            console.log('🔄 Attempting to truncate collection...');
            const result = await pb.send('/api/admins/collections/rooms/truncate', {
                method: 'POST'
            });
            console.log('✅ Collection truncated successfully!');
            return;
        } catch (truncateError) {
            console.log('❌ Truncate failed, falling back to individual deletion...');
        }

        // Method 2: Individual deletion in larger batches
        console.log('🗑️ Deleting rooms individually...');

        const batchSize = 500; // Larger batch size
        let totalDeleted = 0;

        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            console.log(`🗑️ Deleting batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(records.length/batchSize)} (${batch.length} rooms)...`);

            // Delete all in batch simultaneously for speed
            const deletePromises = batch.map(room =>
                pb.collection('rooms').delete(room.id).catch(error => {
                    // Ignore individual errors, just count successful ones
                    return false;
                })
            );

            const results = await Promise.all(deletePromises);
            const successfulDeletes = results.filter(result => result !== false).length;
            totalDeleted += successfulDeletes;

            console.log(`✅ Deleted ${successfulDeletes}/${batch.length} rooms in this batch`);

            // Small delay to avoid overwhelming server
            if (i + batchSize < records.length) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }

        console.log(`🎉 Successfully deleted ${totalDeleted}/${records.length} rooms`);

        // Verify
        const remaining = await pb.collection('rooms').getFullList();
        console.log(`📊 Remaining rooms: ${remaining.length}`);

        if (remaining.length === 0) {
            console.log('✅ All rooms data cleared successfully!');
        } else {
            console.log('⚠️ Some rooms may still remain, try running again');
        }

    } catch (error) {
        console.error('❌ Error:', error);
        console.log('\n💡 Make sure:');
        console.log('1. PocketBase is running on http://localhost:8090');
        console.log('2. You have valid credentials');
        console.log('3. The rooms collection exists');
    }
}

// Run the truncation
console.log('🚨 WARNING: This will delete ALL rooms data!');
console.log('Starting deletion in 3 seconds... (Ctrl+C to cancel)');

setTimeout(() => {
    truncateRoomsCollection();
}, 3000);

