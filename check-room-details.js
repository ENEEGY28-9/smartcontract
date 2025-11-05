import PocketBase from 'pocketbase';

async function checkRoomDetails() {
    const pb = new PocketBase('http://127.0.0.1:8090');

    try {
        console.log('🔍 Checking room details...\n');

        // Get all rooms to find the test room
        const rooms = await pb.collection('rooms').getList(1, 10, {
            sort: '-created'
        });

        const testRoom = rooms.items.find(r => r.name === 'Test Room - Custom Settings');
        if (!testRoom) {
            console.log('❌ Test room not found');
            return;
        }

        console.log('🏠 Room details:');
        console.log('ID:', testRoom.id);
        console.log('Name:', testRoom.name);
        console.log('Max members:', testRoom.max_members);
        console.log('Game type:', testRoom.game_type);
        console.log('Is private:', testRoom.is_private);
        console.log('Password:', testRoom.password);
        console.log('Game settings:', JSON.stringify(testRoom.game_settings, null, 2));

        console.log('\n🎯 Expected UI sync:');
        console.log('- Players slider should be:', testRoom.max_members);
        console.log('- Game tab should be:', testRoom.game_type);
        console.log('- Private checkbox should be:', testRoom.is_private ? 'checked' : 'unchecked');
        console.log('- Password field should show:', testRoom.password ? 'password set' : 'no password');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkRoomDetails();
