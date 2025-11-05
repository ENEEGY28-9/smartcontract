// Create energies collection with proper authentication
// Run: node create-energies-with-auth.js

async function createEnergiesWithAuth() {
    console.log('🎮 Creating energies collection with authentication...');

    const pbUrl = 'http://localhost:8090';

    try {
        // First, list collections to see what's there
        console.log('📋 Checking existing collections...');
        const collectionsResponse = await fetch(`${pbUrl}/api/collections`);
        if (collectionsResponse.ok) {
            const collections = await collectionsResponse.json();
            console.log('📋 Existing collections:', collections.map(c => c.name));

            const energiesExists = collections.find(c => c.name === 'energies');
            if (energiesExists) {
                console.log('✅ Energies collection already exists!');
                console.log('📋 ID:', energiesExists.id);
                return;
            }
        }

        // Try different admin credentials
        const adminCredentials = [
            { identity: 'admin@eneegy.com', password: 'eneegy123' },
            { identity: 'admin@pocketbase.com', password: 'admin123' },
            { identity: 'admin', password: 'admin123' },
            { identity: 'admin@pocketbase.com', password: 'password' }
        ];

        let adminToken = null;

        for (const creds of adminCredentials) {
            try {
                console.log(`🔑 Trying to authenticate as admin with: ${creds.identity}`);

                const authResponse = await fetch(`${pbUrl}/api/admins/auth-with-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(creds)
                });

                if (authResponse.ok) {
                    const authData = await authResponse.json();
                    adminToken = authData.token;
                    console.log('✅ Admin authentication successful!');
                    break;
                } else {
                    console.log(`❌ Auth failed for ${creds.identity}:`, authResponse.status);
                }
            } catch (error) {
                console.log(`❌ Auth error for ${creds.identity}:`, error.message);
            }
        }

        if (!adminToken) {
            console.log('❌ Could not authenticate as admin with any credentials');
            console.log('💡 Please check your PocketBase admin credentials');
            console.log('🌐 PocketBase Admin: http://localhost:8090/_/');
            console.log('📋 See: ENERGY_COLLECTION_SETUP.md for manual creation');
            return;
        }

        // Create the collection
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

        console.log('📝 Creating energies collection...');

        const createResponse = await fetch(`${pbUrl}/api/collections`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(collectionSchema)
        });

        if (createResponse.ok) {
            const result = await createResponse.json();
            console.log('✅ Energies collection created successfully!');
            console.log('📋 Collection ID:', result.id);
            console.log('🎮 Energy system is now ready to use!');
        } else {
            const errorData = await createResponse.text();
            console.log('❌ Creation failed:', createResponse.status, errorData);
            console.log('💡 Please create manually in PocketBase Admin UI');
        }

    } catch (error) {
        console.log('❌ Error:', error.message);
        console.log('💡 Make sure PocketBase is running on http://localhost:8090');
    }
}

createEnergiesWithAuth();
