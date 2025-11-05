import PocketBase from 'pocketbase/cjs';

const pb = new PocketBase('http://localhost:8090');

async function checkRoomUpdate() {
    try {
        console.log('🔐 Logging in to check room...');

        await pb.collection('users').authWithPassword('working@example.com', 'working123456');
        console.log('✅ Login successful');

        console.log('🔍 Finding user rooms...');
        const rooms = await pb.collection('rooms').getFullList({
            filter: `owner_id = "${pb.authStore.model.id}"`
        });

        console.log(`📊 Found ${rooms.length} rooms for user`);

        rooms.forEach((room, index) => {
            console.log(`🏠 Room ${index + 1}:`);
            console.log(`   ID: ${room.id}`);
            console.log(`   Name: ${room.name}`);
            console.log(`   game_type: ${room.game_type}`);
            console.log(`   status: ${room.status}`);
            console.log(`   Created: ${room.created}`);
            console.log('---');
        });

    } catch (error) {
        console.error('❌ Check failed:', error.message);
    }
}

checkRoomUpdate();

