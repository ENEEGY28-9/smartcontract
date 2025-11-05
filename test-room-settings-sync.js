import PocketBase from 'pocketbase';

async function testRoomSettingsSync() {
    const pb = new PocketBase('http://127.0.0.1:8090');

    try {
        console.log('🧪 Testing room settings sync...\n');

        // Create test user
        const testEmail = `settings-test-${Date.now()}@example.com`;
        const testPassword = 'testpassword123';

        console.log('👤 Creating test user...');
        const userRecord = await pb.collection('users').create({
            email: testEmail,
            password: testPassword,
            passwordConfirm: testPassword,
            name: 'Settings Test User'
        });
        console.log('✅ Created test user:', userRecord.id);

        // Authenticate
        await pb.collection('users').authWithPassword(testEmail, testPassword);
        console.log('✅ Authenticated as test user');

        // Create room with custom settings
        console.log('\n🏠 Creating room with custom settings...');
        const customSettings = {
            maxMembers: 12,
            maxPlayers: 12,
            gameType: 'bote',
            gameMode: 'bote',
            timeLimit: 600, // 10 minutes
            isPrivate: true,
            hasPassword: true,
            password: 'testpass123'
        };

        const roomData = {
            name: 'Settings Test Room',
            owner_id: userRecord.id,
            members: [userRecord.id],
            status: 'waiting',
            max_members: customSettings.maxMembers,
            game_type: customSettings.gameType,
            game_settings: customSettings,
            is_private: customSettings.isPrivate,
            password: customSettings.password
        };

        const room = await pb.collection('rooms').create(roomData);
        console.log('✅ Created room:', room.id, room.name);
        console.log('📋 Room settings in DB:');
        console.log('   - max_members:', room.max_members);
        console.log('   - game_type:', room.game_type);
        console.log('   - is_private:', room.is_private);
        console.log('   - game_settings:', JSON.stringify(room.game_settings, null, 2));

        // Update room settings
        console.log('\n🔄 Updating room settings...');
        const updatedSettings = {
            maxMembers: 6,
            maxPlayers: 6,
            timeLimit: 300, // 5 minutes
            isPrivate: false,
            hasPassword: false
        };

        const updatedRoom = await pb.collection('rooms').update(room.id, {
            max_members: updatedSettings.maxMembers,
            game_type: 'rune',
            game_settings: updatedSettings,
            is_private: updatedSettings.isPrivate,
            password: null
        });

        console.log('✅ Updated room settings');
        console.log('📋 Updated room settings in DB:');
        console.log('   - max_members:', updatedRoom.max_members);
        console.log('   - game_type:', updatedRoom.game_type);
        console.log('   - is_private:', updatedRoom.is_private);
        console.log('   - game_settings:', JSON.stringify(updatedRoom.game_settings, null, 2));

        // Cleanup
        console.log('\n🧹 Cleaning up test data...');
        await pb.collection('rooms').delete(room.id);
        console.log('✅ Deleted test room');

        console.log('\n🎉 Settings sync test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Full error:', error);
    }
}

testRoomSettingsSync();
