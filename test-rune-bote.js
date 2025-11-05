import PocketBase from 'pocketbase/cjs';

const pb = new PocketBase('http://localhost:8090');

async function testRuneBoteGames() {
    try {
        console.log('🔐 Logging in test user...');
        await pb.collection('users').authWithPassword('working@example.com', 'working123456');
        console.log('✅ Login successful');

        console.log('🏗️ Creating RUNE room...');
        const runeRoom = await pb.collection('rooms').create({
            name: "RUNE Room",
            owner_id: pb.authStore.model.id,
            members: [pb.authStore.model.id],
            status: 'waiting',
            max_members: 8,
            game_type: 'rune',
            is_private: false
        });
        console.log('✅ Created RUNE room:', runeRoom.id, 'game_type:', runeRoom.game_type);

        console.log('🏗️ Creating BOTE room...');
        const boteRoom = await pb.collection('rooms').create({
            name: "BOTE Room",
            owner_id: pb.authStore.model.id,
            members: [pb.authStore.model.id],
            status: 'waiting',
            max_members: 6,
            game_type: 'bote',
            is_private: false
        });
        console.log('✅ Created BOTE room:', boteRoom.id, 'game_type:', boteRoom.game_type);

        console.log('📊 Checking all rooms...');
        const allRooms = await pb.collection('rooms').getFullList();
        console.log('Total rooms:', allRooms.length);

        const runeRooms = allRooms.filter(r => r.game_type === 'rune');
        const boteRooms = allRooms.filter(r => r.game_type === 'bote');

        console.log('RUNE rooms:', runeRooms.length);
        console.log('BOTE rooms:', boteRooms.length);
        console.log('Other rooms:', allRooms.length - runeRooms.length - boteRooms.length);

        console.log('🎯 Test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testRuneBoteGames();

