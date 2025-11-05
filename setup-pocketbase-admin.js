// Script to setup PocketBase admin and collections
const POCKETBASE_URL = 'http://localhost:8090';

async function setupPocketBase() {
    console.log('🚀 Setting up PocketBase...');

    try {
        // First, try to create admin user (this might fail if already exists)
        console.log('Creating admin user...');
        const adminResponse = await fetch(`${POCKETBASE_URL}/api/admins`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'admin@example.com',
                password: 'admin123456',
                passwordConfirm: 'admin123456'
            })
        });

        if (adminResponse.ok) {
            console.log('✅ Admin user created');
        } else {
            console.log('ℹ️ Admin user may already exist');
        }

        // Now try to authenticate as admin to create collections
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

        if (authResponse.ok) {
            const authData = await authResponse.json();
            const adminToken = authData.token;
            console.log('✅ Admin authenticated');

            // List existing collections first
            console.log('Checking existing collections...');
            const existingCollectionsResponse = await fetch(`${POCKETBASE_URL}/api/collections`, {
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });

            if (existingCollectionsResponse.ok) {
                const existingCollections = await existingCollectionsResponse.json();
                console.log('📋 Existing collections:', existingCollections.items.map(c => c.name));
            }

            // Create users collection
            console.log('Creating users collection...');
            const usersCollection = {
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

            const usersResponse = await fetch(`${POCKETBASE_URL}/api/collections`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                },
                body: JSON.stringify(usersCollection)
            });

            if (usersResponse.ok) {
                console.log('✅ Users collection created');
            } else {
                console.log('ℹ️ Users collection may already exist');
            }

            // Create wallets collection
            console.log('Creating wallets collection...');
            const walletsCollection = {
                name: "wallets",
                schema: [
                    {
                        name: "user_id",
                        type: "text",
                        required: false,
                        options: {
                            maxSize: 200
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
                            values: ["metamask", "phantom", "generated", "bitcoin", "other"],
                            maxSelect: 1
                        }
                    },
                    {
                        name: "network",
                        type: "select",
                        required: true,
                        options: {
                            values: ["ethereum", "solana", "bitcoin"],
                            maxSelect: 1
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

            const walletsResponse = await fetch(`${POCKETBASE_URL}/api/collections`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                },
                body: JSON.stringify(walletsCollection)
            });

            if (walletsResponse.ok) {
                console.log('✅ Wallets collection created');
            } else {
                const errorText = await walletsResponse.text();
                console.log('❌ Failed to create wallets collection:', walletsResponse.status, errorText);

                // Try to create with different name
                console.log('Trying to create with different name...');
                const walletsCollectionAlt = {
                    ...walletsCollection,
                    name: "wallet_data"
                };

                const walletsAltResponse = await fetch(`${POCKETBASE_URL}/api/collections`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${adminToken}`
                    },
                    body: JSON.stringify(walletsCollectionAlt)
                });

                if (walletsAltResponse.ok) {
                    console.log('✅ Wallets collection created with name: wallet_data');
                } else {
                    const altErrorText = await walletsAltResponse.text();
                    console.log('❌ Failed to create wallet_data collection:', walletsAltResponse.status, altErrorText);
                }
            }

            console.log('');
            console.log('🎉 PocketBase setup complete!');
            console.log('');
            console.log('Admin credentials:');
            console.log('Email: admin@example.com');
            console.log('Password: admin123456');
            console.log('');
            console.log('Admin panel: http://localhost:8090/_/');
            console.log('Wallet test: http://localhost:5173/wallet-test');

        } else {
            console.log('❌ Failed to authenticate as admin');
            console.log('Please check if admin user exists and password is correct');
        }

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
    }
}

setupPocketBase();
