const POCKETBASE_URL = 'http://127.0.0.1:8090';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123456';

async function createTestUser() {
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

        console.log('Creating test user...');

        const createUserResponse = await fetch(`${POCKETBASE_URL}/api/collections/users/records`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                username: 'testuser',
                email: 'test@example.com',
                password: 'test123456',
                passwordConfirm: 'test123456',
                name: 'Test User'
            })
        });

        if (!createUserResponse.ok) {
            const errorText = await createUserResponse.text();
            console.log(`User creation failed: ${createUserResponse.status} - ${errorText}`);
            return;
        }

        const newUser = await createUserResponse.json();
        console.log('✅ Test user created successfully!');
        console.log(`Email: test@example.com`);
        console.log(`Password: test123456`);
        console.log(`User ID: ${newUser.id}`);

        // Now test authentication with this user
        console.log('\n🔐 Testing authentication with new user...');

        const userAuthResponse = await fetch(`${POCKETBASE_URL}/api/collections/users/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                identity: 'test@example.com',
                password: 'test123456'
            })
        });

        if (!userAuthResponse.ok) {
            throw new Error(`User auth failed: ${userAuthResponse.status}`);
        }

        const userAuthData = await userAuthResponse.json();
        const userToken = userAuthData.token;

        console.log('✅ User authentication successful!');

        // Test listing rooms
        const listResponse = await fetch(`${POCKETBASE_URL}/api/collections/rooms/records`, {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });

        if (listResponse.ok) {
            const roomsData = await listResponse.json();
            console.log(`✅ User can list rooms: ${roomsData.items.length} rooms found`);

            // Test creating a room
            const createResponse = await fetch(`${POCKETBASE_URL}/api/collections/rooms/records`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}`
                },
                body: JSON.stringify({
                    name: 'Test Room by New User',
                    description: 'Created by test user',
                    max_members: 4,
                    status: 'waiting'
                })
            });

            if (createResponse.ok) {
                console.log('✅ User can create rooms!');
            } else {
                const errorText = await createResponse.text();
                console.log(`❌ User cannot create rooms: ${createResponse.status} - ${errorText}`);
            }

        } else {
            const errorText = await listResponse.text();
            console.log(`❌ User cannot list rooms: ${listResponse.status} - ${errorText}`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

createTestUser();