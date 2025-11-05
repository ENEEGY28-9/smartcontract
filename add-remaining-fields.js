const POCKETBASE_URL = 'http://127.0.0.1:8090';

// Admin credentials
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123456';

async function addRemainingFields() {
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
        console.log('✅ Admin authentication successful');

        // Get collections
        console.log('📋 Fetching collections...');
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

        // Fields to add
        const newFields = [
            {
                system: false,
                id: "game_type_field",
                name: "game_type",
                type: "select",
                required: false,
                presentable: false,
                unique: false,
                options: {
                    maxSelect: 1,
                    values: ["subway_surfers", "infinite_runner", "puzzle", "racing", "other"]
                }
            },
            {
                system: false,
                id: "game_settings_field",
                name: "game_settings",
                type: "json",
                required: false,
                presentable: false,
                unique: false,
                options: {}
            },
            {
                system: false,
                id: "is_private_field",
                name: "is_private",
                type: "bool",
                required: false,
                presentable: false,
                unique: false,
                options: {}
            },
            {
                system: false,
                id: "password_field",
                name: "password",
                type: "text",
                required: false,
                presentable: false,
                unique: false,
                options: {}
            }
        ];

        // Remove the problematic max_players field and add new fields
        const filteredSchema = roomsCollection.schema.filter(field => field.name !== 'max_players');
        const updatedSchema = [...filteredSchema, ...newFields];

        const updatedRoomsCollection = {
            ...roomsCollection,
            schema: updatedSchema
        };

        console.log('📝 Current schema has', roomsCollection.schema.length, 'fields');
        console.log('📝 Removing max_players field and adding new fields...');

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
        console.log('✅ Successfully updated rooms collection with new fields!');
        console.log('📋 New fields added:');
        newFields.forEach(field => console.log(`   - ${field.name} (${field.type})`));

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    }
}

addRemainingFields();
