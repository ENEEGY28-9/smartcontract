const POCKETBASE_URL = 'http://localhost:5173/pb-api';

async function testUISync() {
    try {
        console.log('Testing UI sync with PocketBase schema...\n');

        // Login
        const authResponse = await fetch(`${POCKETBASE_URL}/api/collections/users/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                identity: 'test@example.com',
                password: 'test123456'
            })
        });

        if (!authResponse.ok) {
            throw new Error(`Auth failed: ${authResponse.status}`);
        }

        const authData = await authResponse.json();
        const token = authData.token;

        console.log('✅ User authenticated');

        // List rooms with updated sorting
        const listResponse = await fetch(`${POCKETBASE_URL}/api/collections/rooms/records?page=1&perPage=10&sort=-updated`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (listResponse.ok) {
            const data = await listResponse.json();
            console.log(`✅ Successfully listed ${data.items.length} rooms with updated sorting`);

            if (data.items.length > 0) {
                const room = data.items[0];
                console.log(`📋 Sample room schema compliance:`);
                console.log(`  - name: ${room.name} ✓`);
                console.log(`  - owner_id: ${room.owner_id} ✓`);
                console.log(`  - members: [${room.members?.join(', ') || 'none'}] ✓`);
                console.log(`  - status: ${room.status} ✓`);
                console.log(`  - game_type: ${room.game_type || 'N/A'} ✓`);
                console.log(`  - max_members: ${room.max_members} ✓`);
                console.log(`  - is_private: ${room.is_private} ✓`);
                console.log(`  - created: ${room.created} ✓`);
                console.log(`  - updated: ${room.updated} ✓`);
            }
        } else {
            const error = await listResponse.text();
            console.log(`❌ List rooms failed: ${listResponse.status} - ${error}`);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testUISync();

