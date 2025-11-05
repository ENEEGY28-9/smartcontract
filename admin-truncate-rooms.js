import PocketBase from 'pocketbase/cjs';

// PocketBase connection
const pb = new PocketBase('http://localhost:8090');

async function adminTruncateRooms() {
    try {
        console.log('🔗 Connecting to PocketBase as admin...');

        // Admin authentication
        await pb.admins.authWithPassword('admin@local.com', 'admin12345678');
        console.log('✅ Admin authenticated successfully');

        // Check current room count
        const records = await pb.collection('rooms').getFullList();
        console.log(`📊 Found ${records.length} rooms to delete`);

        // Try truncate operation
        console.log('🔄 Attempting to truncate rooms collection...');
        const result = await pb.send('/api/admins/collections/rooms/truncate', {
            method: 'POST'
        });
        console.log('✅ Collection truncated successfully!');

        // Verify
        const remaining = await pb.collection('rooms').getFullList();
        console.log(`📊 Remaining rooms: ${remaining.length}`);

        if (remaining.length === 0) {
            console.log('🎉 All rooms data cleared successfully!');
        } else {
            console.log('⚠️ Some rooms may still remain');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);

        // Fallback: try individual deletion as admin
        console.log('🔄 Falling back to individual deletion...');

        try {
            await pb.admins.authWithPassword('admin@local.com', 'admin12345678');
            const records = await pb.collection('rooms').getFullList();

            console.log(`🗑️ Deleting ${records.length} rooms individually...`);

            let deleted = 0;
            for (const room of records) {
                try {
                    await pb.collection('rooms').delete(room.id);
                    deleted++;
                    if (deleted % 100 === 0) {
                        console.log(`✅ Deleted ${deleted}/${records.length} rooms`);
                    }
                } catch (deleteError) {
                    // Continue with next room
                }
            }

            console.log(`🎉 Successfully deleted ${deleted} rooms`);

            const remaining = await pb.collection('rooms').getFullList();
            console.log(`📊 Remaining rooms: ${remaining.length}`);

        } catch (fallbackError) {
            console.error('❌ Fallback also failed:', fallbackError.message);
        }
    }
}

// Run the admin truncation
console.log('🚨 WARNING: This will delete ALL rooms data using admin privileges!');
console.log('Starting admin truncation in 3 seconds... (Ctrl+C to cancel)');

setTimeout(() => {
    adminTruncateRooms();
}, 3000);
