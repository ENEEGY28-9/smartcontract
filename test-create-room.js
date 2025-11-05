const POCKETBASE_URL = 'http://localhost:5173/pb-api';

async function testCreateRoom() {
    try {
        console.log('Testing room creation via proxy...');

        // Login first
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

        console.log('✅ Authenticated successfully as:', authData.record.name);

        // Create room with new schema
        const createResponse = await fetch(`${POCKETBASE_URL}/api/collections/rooms/records`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: 'Test Room New Schema',
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
            console.log('Room details:', {
                name: room.name,
                owner_id: room.owner_id,
                members: room.members,
                status: room.status
            });
        } else {
            const error = await createResponse.text();
            console.log(`❌ Room creation failed: ${createResponse.status}`, error);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testCreateRoom();

