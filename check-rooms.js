const POCKETBASE_URL = 'http://127.0.0.1:8090';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123456';

async function checkRooms() {
    try {
        console.log('🔐 Authenticating as admin...');
        const authResponse = await fetch(`${POCKETBASE_URL}/api/admins/auth-with-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                identity: ADMIN_EMAIL,
                password: ADMIN_PASSWORD
            })
        });

        if (!authResponse.ok) {
            throw new Error(`Authentication failed: ${authResponse.status}`);
        }

        const authData = await authResponse.json();
        const adminToken = authData.token;

        const recordsResponse = await fetch(`${POCKETBASE_URL}/api/collections/rooms/records`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (!recordsResponse.ok) {
            throw new Error(`Failed to fetch records: ${recordsResponse.status}`);
        }

        const recordsData = await recordsResponse.json();

        console.log('Rooms count:', recordsData.items.length);
        recordsData.items.forEach(room => {
            console.log(`Room: ${room.name} (${room.id}), Owner: ${room.owner_id}, Members: ${room.members ? room.members.length : 0}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkRooms();

