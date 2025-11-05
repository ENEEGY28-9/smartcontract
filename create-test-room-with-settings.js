import PocketBase from 'pocketbase';

async function createTestRoomWithSettings() {
    const pb = new PocketBase('http://127.0.0.1:8090');

    try {
        console.log('🏠 Creating test room with custom settings...\n');

        // Try to authenticate with existing user first
        try {
            await pb.collection('users').authWithPassword('testuser@example.com', 'testpassword123');
            console.log('✅ Authenticated with existing test user');
        } catch (authError) {
            console.log('⚠️ Could not authenticate existing user, creating new one...');

            // Create new test user
            const testEmail = `room-settings-${Date.now()}@example.com`;
            const userRecord = await pb.collection('users').create({
                email: testEmail,
                password: 'testpassword123',
                passwordConfirm: 'testpassword123',
                name: 'Room Settings Test'
            });
            console.log('✅ Created new test user:', userRecord.id);

            // Authenticate
            await pb.collection('users').authWithPassword(testEmail, 'testpassword123');
            console.log('✅ Authenticated as test user');
        }

        const currentUser = pb.authStore.model;
        console.log('👤 Current user:', currentUser.email, 'ID:', currentUser.id);

        // Create room with specific settings that differ from defaults
        const customSettings = {
            maxMembers: 10,  // Different from default 8
            maxPlayers: 10,
            gameType: 'bote',  // Different from default 'rune'
            gameMode: 'bote',
            timeLimit: 900,   // 15 minutes - different from default 300 (5m)
            isPrivate: true,  // Different from default false
            hasPassword: true,
            password: 'testroom123',
            // Add other settings to make it more complete
            maxPlayersToStart: 2,
            allowSpectators: true,
            autoStart: true
        };

        const roomData = {
            name: 'Test Room - Custom Settings',
            owner_id: currentUser.id,
            members: [currentUser.id],
            status: 'waiting',
            max_members: customSettings.maxMembers,
            game_type: customSettings.gameType,
            settings: customSettings,
            is_private: customSettings.isPrivate,
            password: customSettings.password,
            description: 'Room created for testing settings sync'
        };

        const room = await pb.collection('rooms').create(roomData);
        console.log('✅ Created room with custom settings!');
        console.log('🏠 Room ID:', room.id);
        console.log('🏠 Room Name:', room.name);
        console.log('📋 Custom settings object:', JSON.stringify(customSettings, null, 2));
        console.log('📋 Settings in database:');
        console.log('   - Max Players:', room.max_members);
        console.log('   - Game Type:', room.game_type);
        console.log('   - Is Private:', room.is_private);
        console.log('   - Password:', room.password ? 'Set' : 'Not set');
        console.log('   - Settings field:', room.settings);
        console.log('   - Time Limit in settings:', room.settings?.timeLimit || 'Not set');

        console.log('\n🎯 Expected UI values when loading this room:');
        console.log('   - Players slider: 10');
        console.log('   - Time slider: 15m (900 seconds)');
        console.log('   - Game tabs: BOTE selected');
        console.log('   - Private checkbox: ✅ Checked');
        console.log('   - Password field: testroom123');

        console.log('\n🔗 Test URL: http://localhost:5173/rooms');
        console.log('💡 Login with:', currentUser.email, '/ testpassword123');

        // Don't delete the room so user can test UI

    } catch (error) {
        console.error('❌ Error creating test room:', error);
        console.error('Full error:', error);
    }
}

createTestRoomWithSettings();
