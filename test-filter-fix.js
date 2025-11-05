const POCKETBASE_URL = 'http://localhost:5173/pb-api';

async function testFilterFix() {
    try {
        console.log('Testing room filtering fix...');

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

        // Test filtering by game_type
        const filterResponse = await fetch(`${POCKETBASE_URL}/api/collections/rooms/records?page=1&perPage=10&filter=game_type%20%3D%20%22racing%22&sort=-updated`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (filterResponse.ok) {
            const data = await filterResponse.json();
            console.log(`✅ Filter by game_type succeeded: ${data.items.length} rooms found`);
        } else {
            const error = await filterResponse.text();
            console.log(`❌ Filter failed: ${filterResponse.status} - ${error}`);
        }

        // Test listing all rooms
        const listResponse = await fetch(`${POCKETBASE_URL}/api/collections/rooms/records?page=1&perPage=10&sort=-updated`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (listResponse.ok) {
            const data = await listResponse.json();
            console.log(`✅ List rooms succeeded: ${data.items.length} rooms found`);
        } else {
            const error = await listResponse.text();
            console.log(`❌ List failed: ${listResponse.status} - ${error}`);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testFilterFix();

