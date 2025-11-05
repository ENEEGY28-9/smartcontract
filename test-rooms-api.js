const POCKETBASE_URL = 'http://127.0.0.1:8090';

// Test user credentials (you may need to create these users first)
const TEST_USERS = [
    { email: 'fit@eneegy.com', password: '123456789' },
    { email: 'admin@eneegy.com', password: 'eneegy123' }
];

async function authenticateUser(email, password) {
    const response = await fetch(`${POCKETBASE_URL}/api/collections/users/auth-with-password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            identity: email,
            password: password
        })
    });

    if (!response.ok) {
        throw new Error(`Authentication failed for ${email}: ${response.status}`);
    }

    const data = await response.json();
    return {
        token: data.token,
        record: data.record
    };
}

async function createRoom(ownerToken, roomData) {
    const response = await fetch(`${POCKETBASE_URL}/api/collections/rooms/records`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ownerToken}`
        },
        body: JSON.stringify(roomData)
    });

    if (!response.ok) {
        throw new Error(`Create room failed: ${response.status}`);
    }

    const data = await response.json();
    return data;
}

async function joinRoom(userToken, roomId, password = null) {
    const response = await fetch(`${POCKETBASE_URL}/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify(password ? { password } : {})
    });

    if (!response.ok) {
        throw new Error(`Join room failed: ${response.status}`);
    }

    const data = await response.json();
    return data;
}

async function leaveRoom(userToken, roomId) {
    const response = await fetch(`${POCKETBASE_URL}/api/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({})
    });

    if (!response.ok) {
        throw new Error(`Leave room failed: ${response.status}`);
    }

    const data = await response.json();
    return data;
}

async function kickMember(ownerToken, roomId, memberId) {
    const response = await fetch(`${POCKETBASE_URL}/api/rooms/${roomId}/kick`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ownerToken}`
        },
        body: JSON.stringify({ memberId })
    });

    if (!response.ok) {
        throw new Error(`Kick member failed: ${response.status}`);
    }

    const data = await response.json();
    return data;
}

async function testRoomsAPI() {
    try {
        console.log('🚀 Starting rooms API test...\n');

        // Authenticate users
        console.log('🔐 Authenticating users...');
        const [user1, user2] = await Promise.all([
            authenticateUser(TEST_USERS[0].email, TEST_USERS[0].password),
            authenticateUser(TEST_USERS[1].email, TEST_USERS[1].password)
        ]);

        console.log('✅ Users authenticated');
        console.log(`   User 1: ${user1.record.name} (${user1.record.id})`);
        console.log(`   User 2: ${user2.record.name} (${user2.record.id})\n`);

        // Create a room
        console.log('🏠 Creating a room...');
        const roomData = {
            name: 'Test Game Room',
            description: 'A room for testing API',
            max_members: 4,
            is_private: false,
            game_type: 'subway_surfers',
            status: 'waiting'
        };

        const room = await createRoom(user1.token, roomData);
        console.log('✅ Room created:');
        console.log(`   ID: ${room.id}`);
        console.log(`   Name: ${room.name}`);
        console.log(`   Owner: ${room.owner_id}`);
        console.log(`   Members: ${room.members}\n`);

        // User 2 joins the room
        console.log('🚪 User 2 joining room...');
        await joinRoom(user2.token, room.id);
        console.log('✅ User 2 joined the room\n');

        // Check room status
        console.log('📊 Checking room status...');
        const checkResponse = await fetch(`${POCKETBASE_URL}/api/collections/rooms/records/${room.id}`, {
            headers: {
                'Authorization': `Bearer ${user1.token}`
            }
        });
        const updatedRoom = await checkResponse.json();
        console.log(`   Members now: ${updatedRoom.members}\n`);

        // User 2 leaves the room
        console.log('👋 User 2 leaving room...');
        await leaveRoom(user2.token, room.id);
        console.log('✅ User 2 left the room\n');

        // Owner leaves the room (should delete the room)
        console.log('👑 Owner leaving room (should delete it)...');
        await leaveRoom(user1.token, room.id);
        console.log('✅ Owner left the room\n');

        // Verify room is deleted
        console.log('🔍 Verifying room deletion...');
        const verifyResponse = await fetch(`${POCKETBASE_URL}/api/collections/rooms/records/${room.id}`, {
            headers: {
                'Authorization': `Bearer ${user1.token}`
            }
        });

        if (verifyResponse.status === 404) {
            console.log('✅ Room was successfully deleted\n');
        } else {
            console.log('⚠️ Room still exists\n');
        }

        console.log('🎉 All tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

testRoomsAPI();

