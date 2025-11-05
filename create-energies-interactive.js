// Interactive script to create energies collection
// Run: node create-energies-interactive.js

import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, resolve);
    });
}

async function createEnergiesInteractive() {
    console.log('🎮 Interactive Energy Collection Creator');
    console.log('=====================================\n');

    try {
        const pbUrl = await askQuestion('PocketBase URL (default: http://localhost:8090): ');
        const finalUrl = pbUrl || 'http://localhost:8090';

        const adminEmail = await askQuestion('Admin email: ');
        const adminPassword = await askQuestion('Admin password: ');

        if (!adminEmail || !adminPassword) {
            console.log('❌ Admin credentials required');
            rl.close();
            return;
        }

        console.log(`\n🔑 Authenticating with: ${adminEmail}`);

        // Authenticate
        const authResponse = await fetch(`${finalUrl}/api/admins/auth-with-password`, {
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
            console.log('❌ Authentication failed');
            rl.close();
            return;
        }

        const authData = await authResponse.json();
        const adminToken = authData.token;
        console.log('✅ Authentication successful!');

        // Check if collection exists
        console.log('📋 Checking existing collections...');
        const collectionsResponse = await fetch(`${finalUrl}/api/collections`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`,
            }
        });

        if (collectionsResponse.ok) {
            const collections = await collectionsResponse.json();
            const energiesExists = collections.find(c => c.name === 'energies');
            if (energiesExists) {
                console.log('✅ Energies collection already exists!');
                rl.close();
                return;
            }
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

        const createResponse = await fetch(`${finalUrl}/api/collections`, {
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
            console.log('\n🎮 Energy system is now ready to use!');
            console.log('🌐 Test it at: http://localhost:5173/wallet-test');
        } else {
            const errorData = await createResponse.text();
            console.log('❌ Creation failed:', createResponse.status, errorData);
        }

    } catch (error) {
        console.log('❌ Error:', error.message);
    }

    rl.close();
}

createEnergiesInteractive();
