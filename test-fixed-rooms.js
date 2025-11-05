const POCKETBASE_URL = 'http://localhost:5173/pb-api';

async function testFixedRooms() {
    try {
        console.log('Testing room creation and listing after fixes...');

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
            const error = await authResponse.text();
            throw new Error(`Auth failed: ${authResponse.status} - ${error}`);
        }

        const authData = await authResponse.json();
        const token = authData.token;

        console.log('✅ Authenticated successfully');

        // Create room
        const createResponse = await fetch(`${POCKETBASE_URL}/api/collections/rooms/records`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: 'Test Fixed Room',
                owner_id: authData.record.id,
                members: [authData.record.id],
                status: 'waiting',
                max_members: 4,
                game_type: 'subway_surfers',
                game_settings: { test: true },
                is_private: false
            })
        });

        if (createResponse.ok) {
            const room = await createResponse.json();
            console.log('✅ Room created successfully:', room.id);
        } else {
            const error = await createResponse.text();
            console.log(`❌ Room creation failed: ${createResponse.status}`, error);
            return;
        }

        // List rooms
        const listResponse = await fetch(`${POCKETBASE_URL}/api/collections/rooms/records?page=1&perPage=100&sort=-updated`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (listResponse.ok) {
            const data = await listResponse.json();
            console.log(`✅ Room listing successful: ${data.items.length} rooms found`);
        } else {
            const error = await listResponse.text();
            console.log(`❌ Room listing failed: ${listResponse.status}`, error);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testFixedRooms();

