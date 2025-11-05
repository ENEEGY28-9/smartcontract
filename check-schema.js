const POCKETBASE_URL = 'http://127.0.0.1:8090';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123456';

async function checkSchema() {
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

        if (!roomsCollection) {
            throw new Error('Rooms collection not found');
        }

        console.log('Current schema fields:');
        roomsCollection.schema.forEach((field, index) => {
            console.log(`${index}: ${field.name} (${field.type})`, JSON.stringify(field.options, null, 2));
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkSchema();

