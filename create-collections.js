// Script to create PocketBase collections via API
// Run this with Node.js or in browser console

const POCKETBASE_URL = 'http://localhost:8090';

async function createUsersCollection() {
    try {
        console.log('Creating users collection...');

        const usersSchema = {
            name: "users",
            schema: [
                {
                    name: "email",
                    type: "email",
                    required: true,
                    options: {
                        exceptDomains: [],
                        onlyDomains: []
                    }
                },
                {
                    name: "name",
                    type: "text",
                    required: false,
                    options: {
                        maxSize: 200
                    }
                },
                {
                    name: "avatar",
                    type: "file",
                    required: false,
                    options: {
                        maxSize: 5242880,
                        mimeTypes: ["image/jpeg", "image/png", "image/gif"],
                        thumbs: []
                    }
                }
            ],
            listRule: null,
            viewRule: null,
            createRule: null,
            updateRule: null,
            deleteRule: null
        };

        const response = await fetch(`${POCKETBASE_URL}/api/collections`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(usersSchema)
        });

        if (response.ok) {
            console.log('✅ Users collection created successfully');
            return await response.json();
        } else {
            const error = await response.text();
            console.log('ℹ️ Users collection may already exist or failed:', error);
            return null;
        }
    } catch (error) {
        console.error('❌ Error creating users collection:', error);
        return null;
    }
}

async function createWalletsCollection() {
    try {
        console.log('Creating wallets collection...');

        const walletsSchema = {
            name: "wallets",
            schema: [
                {
                    name: "user_id",
                    type: "relation",
                    required: false,
                    options: {
                        collectionId: "users",
                        cascadeDelete: false,
                        minSelect: null,
                        maxSelect: 1
                    }
                },
                {
                    name: "address",
                    type: "text",
                    required: true,
                    options: {
                        maxSize: 200
                    }
                },
                {
                    name: "private_key",
                    type: "text",
                    required: false,
                    options: {
                        maxSize: 2000
                    }
                },
                {
                    name: "mnemonic",
                    type: "text",
                    required: false,
                    options: {
                        maxSize: 1000
                    }
                },
                {
                    name: "wallet_type",
                    type: "select",
                    required: true,
                    options: {
                        values: ["metamask", "phantom", "generated", "bitcoin", "other"]
                    }
                },
                {
                    name: "network",
                    type: "select",
                    required: true,
                    options: {
                        values: ["ethereum", "solana", "bitcoin"]
                    }
                },
                {
                    name: "balance",
                    type: "number",
                    required: false,
                    options: {
                        min: 0
                    }
                },
                {
                    name: "balance_last_updated",
                    type: "date",
                    required: false
                },
                {
                    name: "is_connected",
                    type: "bool",
                    required: false
                },
                {
                    name: "notes",
                    type: "text",
                    required: false,
                    options: {
                        maxSize: 1000
                    }
                }
            ],
            listRule: "user_id = @request.auth.id",
            viewRule: "user_id = @request.auth.id",
            createRule: "@request.auth.id != \"\"",
            updateRule: "user_id = @request.auth.id",
            deleteRule: "user_id = @request.auth.id"
        };

        const response = await fetch(`${POCKETBASE_URL}/api/collections`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(walletsSchema)
        });

        if (response.ok) {
            console.log('✅ Wallets collection created successfully');
            return await response.json();
        } else {
            const error = await response.text();
            console.log('ℹ️ Wallets collection may already exist or failed:', error);
            return null;
        }
    } catch (error) {
        console.error('❌ Error creating wallets collection:', error);
        return null;
    }
}

async function createAdminUser() {
    try {
        console.log('Creating admin user...');

        const adminData = {
            email: "admin@example.com",
            password: "admin123456",
            passwordConfirm: "admin123456"
        };

        const response = await fetch(`${POCKETBASE_URL}/api/admins`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(adminData)
        });

        if (response.ok) {
            console.log('✅ Admin user created successfully');
            return await response.json();
        } else {
            const error = await response.text();
            console.log('ℹ️ Admin user may already exist or failed:', error);
            return null;
        }
    } catch (error) {
        console.error('❌ Error creating admin user:', error);
        return null;
    }
}

async function setupAllCollections() {
    console.log('🚀 Starting PocketBase setup...');

    try {
        await createAdminUser();
        await createUsersCollection();
        await createWalletsCollection();

        console.log('🎉 PocketBase setup complete!');
        console.log('');
        console.log('Next steps:');
        console.log('1. Open admin panel: http://localhost:8090/_/');
        console.log('2. Login with: admin@example.com / admin123456');
        console.log('3. Create a regular user account for testing');
        console.log('4. Start wallet test: npm run dev');

    } catch (error) {
        console.error('❌ Setup failed:', error);
    }
}

// Run setup if this script is executed directly
if (typeof require !== 'undefined' && require.main === module) {
    setupAllCollections();
}

// Export for use in other modules
module.exports = {
    setupAllCollections,
    createUsersCollection,
    createWalletsCollection,
    createAdminUser
};
