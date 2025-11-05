import PocketBase from 'pocketbase/cjs';

// Test the room creation logic
const pb = new PocketBase('http://localhost:8090');

async function testRoomLogic() {
    try {
        console.log('🔐 Logging in test user...');

        // Login
        await pb.collection('users').authWithPassword('working@example.com', 'working123456');
        console.log('✅ Login successful');

        console.log('📊 Checking initial rooms...');
        const initialRooms = await pb.collection('rooms').getFullList();
        console.log('Initial rooms count:', initialRooms.length);

        console.log('🏗️ Creating first room...');
        const room1 = await pb.collection('rooms').create({
            name: "Test Room 1",
            owner_id: pb.authStore.model.id,
            members: [pb.authStore.model.id],
            status: 'waiting',
            max_members: 8,
            game_type: 'infinite_runner',
            is_private: false
        });
        console.log('✅ Created room 1:', room1.id);

        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('📊 Checking rooms after first creation...');
        const roomsAfter1 = await pb.collection('rooms').getFullList();
        console.log('Rooms count after 1:', roomsAfter1.length);

        // Simulate what the app does - check existing rooms
        console.log('🔍 Checking existing rooms for user...');
        const userRooms = roomsAfter1.filter(room =>
            room.owner_id === pb.authStore.model.id &&
            (room.status === 'waiting' || room.status === 'playing')
        );
        console.log('User active rooms found:', userRooms.length);

        if (userRooms.length > 0) {
            console.log('✅ Existing room found, should NOT create new room');
            console.log('Existing room:', userRooms[0].name, userRooms[0].id);
        } else {
            console.log('❌ No existing room found - this would trigger room creation (BUG!)');
        }

        console.log('🎯 Test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run test
testRoomLogic();

