// Direct creation of energies collection via PocketBase API
// Run: node create-energies-direct.js

async function createEnergiesCollection() {
    console.log('🎮 Creating energies collection directly...');

    const pbUrl = 'http://localhost:8090';

    // First, let's try to list existing collections to see what's there
    try {
        console.log('📋 Checking existing collections...');
        const collectionsResponse = await fetch(`${pbUrl}/api/collections`);
        if (collectionsResponse.ok) {
            const collections = await collectionsResponse.json();
            console.log('📋 Existing collections:', collections.map(c => c.name));

            const energiesExists = collections.find(c => c.name === 'energies');
            if (energiesExists) {
                console.log('✅ Energies collection already exists!');
                return;
            }
        }

        console.log('❌ Energies collection not found, attempting to create...');

        // Try to create without authentication first (maybe it allows anonymous creation)
        const collectionSchema = {
            name: "energies",
            type: "base",
            schema: [
                {
                    name: "user_id",
                    type: "relation",
                    required: true,
                    options: {
                        collectionId: "_pb_users_auth_",
                        cascadeDelete: true,
                        minSelect: 1,
                        maxSelect: 1,
                        displayFields: ["email"]
                    }
                },
                {
                    name: "points",
                    type: "number",
                    required: true,
                    options: {
                        min: 0
                    }
                },
                {
                    name: "last_updated",
                    type: "date",
                    required: false
                }
            ],
            indexes: [
                "CREATE UNIQUE INDEX idx_energies_user_id ON energies (user_id)"
            ],
            listRule: 'user_id = @request.auth.id',
            viewRule: 'user_id = @request.auth.id',
            createRule: 'user_id = @request.auth.id',
            updateRule: 'user_id = @request.auth.id',
            deleteRule: '@request.auth.id != "" && user_id = @request.auth.id'
        };

        console.log('📝 Creating collection...');
        const createResponse = await fetch(`${pbUrl}/api/collections`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(collectionSchema)
        });

        if (createResponse.ok) {
            const result = await createResponse.json();
            console.log('✅ Energies collection created successfully!');
            console.log('📋 Collection ID:', result.id);
        } else {
            const errorData = await createResponse.text();
            console.log('❌ Creation failed:', createResponse.status, errorData);

            // If it requires authentication, let's try to create manually via file
            console.log('💡 You may need to create this collection manually in PocketBase Admin UI');
            console.log('🌐 URL: http://localhost:8090/_/');
            console.log('📋 See: ENERGY_COLLECTION_SETUP.md for detailed instructions');
        }

    } catch (error) {
        console.log('❌ Error:', error.message);
        console.log('💡 Make sure PocketBase is running on http://localhost:8090');
    }
}

createEnergiesCollection();
