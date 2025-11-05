const POCKETBASE_URL = 'http://127.0.0.1:8090';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123456';

async function checkCurrentSchema() {
    try {
        console.log('🔍 Checking current PocketBase Rooms schema...\n');

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

        const collectionsResponse = await fetch(`${POCKETBASE_URL}/api/collections`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (!collectionsResponse.ok) {
            throw new Error(`Failed to fetch collections: ${collectionsResponse.status}`);
        }

        const collectionsData = await collectionsResponse.json();
        const roomsCollection = collectionsData.items.find(col => col.name === 'rooms');

        console.log('📋 PocketBase Rooms Schema:');
        console.log('='.repeat(50));
        roomsCollection.schema.forEach((field, index) => {
            console.log(`${index + 1}. ${field.name} (${field.type}) - Required: ${field.required}`);
            if (field.options && Object.keys(field.options).length > 0) {
                if (field.type === 'select' && field.options.values) {
                    console.log(`   Values: [${field.options.values.join(', ')}]`);
                } else if (field.type === 'number' && field.options) {
                    console.log(`   Range: ${field.options.min || 'N/A'} - ${field.options.max || 'N/A'}`);
                }
            }
        });

        console.log('\n📊 Sample Rooms:');
        console.log('='.repeat(30));

        const recordsResponse = await fetch(`${POCKETBASE_URL}/api/collections/rooms/records?perPage=3`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (recordsResponse.ok) {
            const recordsData = await recordsResponse.json();
            recordsData.items.forEach((room, index) => {
                console.log(`${index + 1}. ${room.name}`);
                console.log(`   ID: ${room.id}`);
                console.log(`   Owner: ${room.owner_id}`);
                console.log(`   Members: ${room.members?.length || 0}`);
                console.log(`   Status: ${room.status}`);
                console.log(`   Game Type: ${room.game_type || 'N/A'}`);
                console.log(`   Max Members: ${room.max_members}`);
                console.log(`   Private: ${room.is_private}`);
                console.log(`   Created: ${new Date(room.created).toLocaleString()}`);
                console.log('');
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkCurrentSchema();

