const POCKETBASE_URL = 'http://localhost:5173/pb-api';

async function testRoomStateFix() {
    try {
        console.log('Testing room listing after RoomState fix...');

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

        // List rooms
        const listResponse = await fetch(`${POCKETBASE_URL}/api/collections/rooms/records?page=1&perPage=10&sort=-updated`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (listResponse.ok) {
            const data = await listResponse.json();
            console.log(`✅ Room listing succeeded: ${data.items.length} rooms found`);

            if (data.items.length > 0) {
                const room = data.items[0];
                console.log(`Sample room status: ${room.status}`);
            }
        } else {
            const error = await listResponse.text();
            console.log(`❌ Room listing failed: ${listResponse.status} - ${error}`);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testRoomStateFix();

