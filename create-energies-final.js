// Create energies collection with provided admin credentials
// Run: node create-energies-final.js

async function createEnergiesFinal() {
    console.log('🎮 Creating energies collection with provided credentials...');

    const pbUrl = 'http://localhost:8090';
    const adminEmail = 'admin@example.com';
    const adminPassword = 'admin123456';

    try {
        console.log(`🔑 Authenticating as admin: ${adminEmail}`);

        // Authenticate
        const authResponse = await fetch(`${pbUrl}/api/admins/auth-with-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                identity: adminEmail,
                password: adminPassword
            })
        });

        if (!authResponse.ok) {
            const errorData = await authResponse.text();
            console.log('❌ Authentication failed:', authResponse.status, errorData);
            return;
        }

        const authData = await authResponse.json();
        const adminToken = authData.token;
        console.log('✅ Authentication successful!');

        // Check if collection exists
        console.log('📋 Checking existing collections...');
        const collectionsResponse = await fetch(`${pbUrl}/api/collections`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`,
            }
        });

        if (collectionsResponse.ok) {
            const collections = await collectionsResponse.json();
            console.log('📋 Existing collections:');
            if (Array.isArray(collections)) {
                console.log('  ', collections.map(c => c.name).join(', '));

                const energiesExists = collections.find(c => c.name === 'energies');
                if (energiesExists) {
                    console.log('✅ Energies collection already exists!');
                    console.log('📋 ID:', energiesExists.id);
                    console.log('🎮 Energy system is ready to use!');
                    return;
                }
            } else {
                console.log('  Collections response:', collections);
            }
        } else {
            console.log('❌ Failed to fetch collections:', collectionsResponse.status);
        }

        // Create collection
        console.log('📝 Creating energies collection...');

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
            console.log('\n🎮 Energy system is now fully operational!');
            console.log('🌐 Test it at: http://localhost:5173/wallet-test');
            console.log('⚡ Features:');
            console.log('  - Energy persistence in database');
            console.log('  - Two-way conversion (E ↔ Crypto)');
            console.log('  - User-specific energy balance');
            console.log('  - Admin controls for testing');
        } else {
            const errorData = await createResponse.text();
            console.log('❌ Creation failed:', createResponse.status, errorData);
        }

    } catch (error) {
        console.log('❌ Error:', error.message);
        console.log('💡 Make sure PocketBase is running on http://localhost:8090');
    }
}

createEnergiesFinal();
