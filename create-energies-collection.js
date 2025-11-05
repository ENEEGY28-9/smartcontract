// Create energies collection for PocketBase
// Run with: node create-energies-collection.js

async function createEnergiesCollection() {
    console.log('🎮 Creating energies collection for PocketBase...');

    try {
        const pbUrl = 'http://localhost:8090';

        // Authenticate as admin
        console.log('🔑 Authenticating as admin...');
        const authResponse = await fetch(`${pbUrl}/api/admins/auth-with-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                identity: 'admin@eneegy.com',
                password: 'eneegy123'
            })
        });

        if (!authResponse.ok) {
            throw new Error(`Admin auth failed: ${authResponse.status}`);
        }

        const authData = await authResponse.json();
        const adminToken = authData.token;

        console.log('✅ Admin authentication successful');

        // Create energies collection
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
        } else {
            const errorData = await createResponse.text();
            console.log('❌ Error creating collection:', createResponse.status);

            // Check if already exists
            if (errorData.includes('already exists') || createResponse.status === 400) {
                console.log('ℹ️  Collection might already exist');

                // Try to list collections to verify
                const listResponse = await fetch(`${pbUrl}/api/collections`, {
                    headers: {
                        'Authorization': `Bearer ${adminToken}`,
                    }
                });

                if (listResponse.ok) {
                    const collections = await listResponse.json();
                    const energiesCollection = collections.find(c => c.name === 'energies');
                    if (energiesCollection) {
                        console.log('✅ Energies collection already exists!');
                        console.log('📋 Collection ID:', energiesCollection.id);
                    }
                }
            } else {
                console.log('❌ Error details:', errorData);
            }
        }

    } catch (error) {
        console.error('❌ Script error:', error.message);
    }

    console.log('\n📋 Summary:');
    console.log('- Collection name: energies');
    console.log('- Fields: user_id (relation), points (number), last_updated (date)');
    console.log('- Rules: User can only access their own energy data');
    console.log('- Unique index on user_id for one record per user');
    console.log('\n🎮 Energy system is now integrated with PocketBase!');
}

createEnergiesCollection();
