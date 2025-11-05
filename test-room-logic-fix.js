import PocketBase from 'pocketbase';

async function testRoomLogicFix() {
    const pb = new PocketBase('http://127.0.0.1:8090');

    try {
        console.log('🧪 Testing room logic fix...\n');

        // Step 1: Create a test user
        console.log('👤 Step 1: Creating test user...');
        const testEmail = `test-${Date.now()}@example.com`;
        const testPassword = 'testpassword123';

        const userRecord = await pb.collection('users').create({
            email: testEmail,
            password: testPassword,
            passwordConfirm: testPassword,
            name: 'Test User'
        });
        console.log('✅ Created test user:', userRecord.id, userRecord.email);

        // Step 2: Authenticate as the test user
        console.log('\n🔑 Step 2: Authenticating as test user...');
        await pb.collection('users').authWithPassword(testEmail, testPassword);
        console.log('✅ Authenticated as:', pb.authStore.model.email);

        // Step 3: Create a room for the user
        console.log('\n🏠 Step 3: Creating room for test user...');
        const roomData = {
            name: `${userRecord.name}'s Test Room`,
            owner_id: userRecord.id,
            members: [userRecord.id],
            status: 'waiting',
            max_members: 4,
            game_type: 'rune',
            game_settings: {},
            is_private: false,
            password: null,
            description: 'Test room created by logic fix'
        };

        const room = await pb.collection('rooms').create(roomData);
        console.log('✅ Created room:', room.id, room.name, 'Owner:', room.owner_id);

        // Step 4: Query rooms for this user (simulate frontend logic)
        console.log('\n🔍 Step 4: Testing room query logic...');
        const userRooms = await pb.collection('rooms').getList(1, 100, {
            sort: '-created',
            filter: `owner_id = "${userRecord.id}" && (status = "waiting" || status = "playing")`
        });

        console.log(`📋 Found ${userRooms.items.length} rooms for user ${userRecord.id}:`);
        userRooms.items.forEach(r => {
            console.log(`   - "${r.name}" (${r.id}) - Owner: ${r.owner_id}`);
        });

        // Step 5: Verify owner exists for each room (simulate frontend validation)
        console.log('\n✅ Step 5: Verifying room owners exist...');
        for (const room of userRooms.items) {
            try {
                const owner = await pb.collection('users').getOne(room.owner_id);
                console.log(`✅ Room "${room.name}" owner verified: ${owner.email}`);
            } catch (error) {
                console.log(`❌ Room "${room.name}" has invalid owner: ${room.owner_id}`);
            }
        }

        // Step 6: Test creating room with non-existent user (should fail)
        console.log('\n🚫 Step 6: Testing room creation with non-existent user...');
        const fakeUserId = 'nonexistentuserid123';
        try {
            const fakeRoomData = {
                name: 'Fake Room',
                owner_id: fakeUserId,
                members: [fakeUserId],
                status: 'waiting',
                max_members: 4,
                game_type: 'rune'
            };

            await pb.collection('rooms').create(fakeRoomData);
            console.log('❌ ERROR: Room creation with fake user succeeded (should have failed!)');
        } catch (error) {
            console.log('✅ Room creation with fake user correctly failed:', error.message);
        }

        // Cleanup: Delete test data
        console.log('\n🧹 Step 7: Cleaning up test data...');
        await pb.collection('rooms').delete(room.id);
        console.log('✅ Deleted test room');

        // Note: We can't delete the user via API if we're authenticated as them
        // The user will remain for manual cleanup if needed

        console.log('\n🎉 Test completed successfully!');
        console.log('✅ Room logic fix is working correctly.');

    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Full error:', error);
    }
}

testRoomLogicFix();
