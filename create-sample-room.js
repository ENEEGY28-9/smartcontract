// Script to create a sample room record
const POCKETBASE_URL = 'http://localhost:8090';

async function createSampleRoom() {
    console.log('🚀 Creating sample room...');

    try {
        // Authenticate as admin
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
            throw new Error('Authentication failed');
        }

        const authData = await authResponse.json();
        const adminToken = authData.token;
        console.log('✅ Admin authenticated');

        // Get current user ID for owner
        const usersResponse = await fetch(`${POCKETBASE_URL}/api/collections/_pb_users_auth_/records`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (!usersResponse.ok) {
            throw new Error('Failed to get users');
        }

        const usersData = await usersResponse.json();
        const ownerId = usersData.items[0]?.id; // Get first user as owner

        if (!ownerId) {
            throw new Error('No users found');
        }

        console.log('Owner ID:', ownerId);

        // Create sample room
        const roomData = {
            name: "Sample Game Room",
            description: "A sample room for testing",
            max_players: 4,
            owner_id: ownerId,
            members: [ownerId],
            status: "waiting",
            max_members: 4,
            is_private: false
        };

        console.log('Creating room with data:', roomData);

        const createResponse = await fetch(`${POCKETBASE_URL}/api/collections/1378lh283rztfah/records`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify(roomData)
        });

        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            console.log('❌ Failed to create room:', createResponse.status, errorText);
            return;
        }

        const createdRoom = await createResponse.json();
        console.log('✅ Room created successfully:', createdRoom);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

createSampleRoom();

