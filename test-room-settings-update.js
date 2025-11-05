import PocketBase from 'pocketbase/cjs';

// Test room settings update functionality
const pb = new PocketBase('http://localhost:8090');

async function testRoomSettingsUpdate() {
    try {
        console.log('🔐 Logging in test user...');

        // Login with test user
        await pb.collection('users').authWithPassword('working@example.com', 'working123456');
        console.log('✅ Login successful');

        console.log('🏗️ Creating test room...');

        // Create a test room
        const room = await pb.collection('rooms').create({
            name: "Room Settings Test",
            owner_id: pb.authStore.model.id,
            members: [pb.authStore.model.id],
            status: 'waiting',
            max_members: 8,
            game_type: 'rune',  // Start with 'rune'
            is_private: false,
            game_settings: {
                gameType: 'rune',
                gameMode: 'rune'
            }
        });
        console.log('✅ Created room:', room.id, 'with game_type:', room.game_type);

        console.log('🎮 Testing game type update to "bote"...');

        // Update room settings to 'bote' (this simulates what happens when user clicks BOTE button)
        const updatedRoom = await pb.collection('rooms').update(room.id, {
            game_settings: {
                gameType: 'bote',
                gameMode: 'bote'
            },
            game_type: 'bote'  // This should now be updated by our fix
        });

        console.log('✅ Updated room settings');
        console.log('📊 Room game_type after update:', updatedRoom.game_type);
        console.log('📊 Room game_settings after update:', updatedRoom.game_settings);

        // Verify the update worked
        if (updatedRoom.game_type === 'bote') {
            console.log('🎉 SUCCESS: game_type field was updated correctly!');
        } else {
            console.log('❌ FAILED: game_type field was not updated. Current value:', updatedRoom.game_type);
        }

        // Clean up - delete test room
        console.log('🧹 Cleaning up test room...');
        await pb.collection('rooms').delete(room.id);
        console.log('✅ Test room deleted');

        console.log('🎯 Room settings update test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Full error:', error);
    }
}

// Run test
testRoomSettingsUpdate();

