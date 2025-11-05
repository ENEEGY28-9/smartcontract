// Script to setup complete rooms collection with all necessary fields
const POCKETBASE_URL = 'http://localhost:8090';

async function updateRoomsCollection() {
    console.log('🚀 Updating rooms collection with complete schema...');

    try {
        // First authenticate as admin
        console.log('Authenticating as admin...');
        const authResponse = await fetch(`${POCKETBASE_URL}/api/admins/auth-with-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                identity: 'admin@example.com',
                password: 'admin123456'
            })
        });

        if (!authResponse.ok) {
            throw new Error('Failed to authenticate');
        }

        const authData = await authResponse.json();
        const adminToken = authData.token;
        console.log('✅ Admin authenticated');

        // Get current collection
        console.log('Getting current rooms collection...');
        const collectionsResponse = await fetch(`${POCKETBASE_URL}/api/collections`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (!collectionsResponse.ok) {
            throw new Error('Failed to get collections');
        }

        const collectionsData = await collectionsResponse.json();
        console.log('Collections response:', JSON.stringify(collectionsData, null, 2));

        const collections = collectionsData.items || collectionsData;
        const roomsCollection = collections.find(c => c.name === 'rooms');

        if (!roomsCollection) {
            throw new Error('Rooms collection not found');
        }

        console.log('Current rooms collection ID:', roomsCollection.id);

        // Update collection with complete schema
        const updatedCollection = {
            ...roomsCollection,
            schema: [
                // Keep existing fields
                ...roomsCollection.schema,

                // Add new fields
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
                    id: "status_field",
                    name: "status",
                    type: "select",
                    required: true,
                    presentable: false,
                    unique: false,
                    options: {
                        maxSelect: 1,
                        values: ["waiting", "playing", "finished", "cancelled"]
                    }
                },
                {
                    system: false,
                    id: "max_members_field",
                    name: "max_members",
                    type: "number",
                    required: true,
                    presentable: false,
                    unique: false,
                    options: {
                        min: 2,
                        max: 50,
                        noDecimal: false
                    }
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
                    options: {
                        min: null,
                        max: null,
                        pattern: ""
                    }
                }
            ]
        };

        console.log('Updating rooms collection...');
        const updateResponse = await fetch(`${POCKETBASE_URL}/api/collections/${roomsCollection.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify(updatedCollection)
        });

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            throw new Error(`Failed to update collection: ${updateResponse.status} ${errorText}`);
        }

        console.log('✅ Rooms collection updated successfully!');
        console.log('');
        console.log('🎉 Rooms collection schema:');
        console.log('- name (text, required) - Room name');
        console.log('- description (text, optional) - Room description');
        console.log('- max_players (number, optional) - Max players');
        console.log('- owner_id (relation single to users) - Room owner');
        console.log('- members (relation multiple to users) - Room members');
        console.log('- game_type (select) - Game type to play');
        console.log('- game_settings (json) - Game configuration');
        console.log('- status (select, required) - Room status');
        console.log('- max_members (number, required) - Maximum members');
        console.log('- is_private (bool) - Private room flag');
        console.log('- password (text, optional) - Room password');
        console.log('');
        console.log('🔧 Room Logic:');
        console.log('- Owner can kick members');
        console.log('- Members can leave room');
        console.log('- When owner leaves and room is empty -> auto delete');
        console.log('- When owner leaves and room has members -> transfer ownership');
        console.log('- Private rooms require password to join');

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
    }
}

updateRoomsCollection();
