const POCKETBASE_URL = 'http://127.0.0.1:8090';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123456';

async function checkGameSettings() {
    try {
        console.log('🔍 Checking game_settings content in rooms...\n');

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

        const recordsResponse = await fetch(`${POCKETBASE_URL}/api/collections/rooms/records?perPage=5`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (!recordsResponse.ok) {
            throw new Error(`Failed to fetch records: ${recordsResponse.status}`);
        }

        const recordsData = await recordsResponse.json();

        console.log('Sample rooms game_settings:');
        recordsData.items.forEach((room, index) => {
            console.log(`${index + 1}. ${room.name}`);
            console.log(`   game_type: ${room.game_type}`);
            console.log(`   game_settings: ${JSON.stringify(room.game_settings, null, 2)}`);
            console.log('');
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkGameSettings();

