const POCKETBASE_URL = 'http://127.0.0.1:8090';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123456';

async function addSingleField() {
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

        console.log('✅ Found rooms collection');

        // Add single field
        const newField = {
            system: false,
            id: "game_settings_field",
            name: "game_settings",
            type: "json",
            required: false,
            presentable: false,
            unique: false,
            options: {}
        };

        const updatedSchema = [...roomsCollection.schema, newField];

        const updatedRoomsCollection = {
            ...roomsCollection,
            schema: updatedSchema
        };

        console.log('📝 Adding game_type field...');

        const updateResponse = await fetch(`${POCKETBASE_URL}/api/collections/${roomsCollection.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify(updatedRoomsCollection)
        });

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            throw new Error(`Failed to update collection: ${updateResponse.status} - ${errorText}`);
        }

        const updatedCollection = await updateResponse.json();
        console.log('✅ Successfully added game_type field!');

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
    }
}

addSingleField();
