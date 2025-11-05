import PocketBase from 'pocketbase/cjs';

const pb = new PocketBase('http://localhost:8090');

async function testGameTypeSwitch() {
    try {
        console.log('🔐 Logging in to test game type switching...');

        await pb.collection('users').authWithPassword('working@example.com', 'working123456');
        console.log('✅ Login successful');

        console.log('🔍 Finding user rooms...');
        const rooms = await pb.collection('rooms').getFullList({
            filter: `owner_id = "${pb.authStore.model.id}" && status = "waiting"`
        });

        if (rooms.length === 0) {
            console.log('❌ No active rooms found');
            return;
        }

        const room = rooms[0];
        console.log(`📊 Current room game_type: ${room.game_type}`);

        // Test switching to rune
        console.log('🎮 Switching to RUNE...');
        const runeUpdate = await pb.collection('rooms').update(room.id, {
            game_settings: {
                gameType: 'rune',
                gameMode: 'rune'
            },
            game_type: 'rune'
        });

        console.log('✅ Switched to RUNE');
        console.log(`📊 Room game_type after RUNE update: ${runeUpdate.game_type}`);

        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Test switching back to bote
        console.log('🎮 Switching back to BOTE...');
        const boteUpdate = await pb.collection('rooms').update(room.id, {
            game_settings: {
                gameType: 'bote',
                gameMode: 'bote'
            },
            game_type: 'bote'
        });

        console.log('✅ Switched to BOTE');
        console.log(`📊 Room game_type after BOTE update: ${boteUpdate.game_type}`);

        console.log('🎯 Game type switching test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Full error:', error);
    }
}

testGameTypeSwitch();

