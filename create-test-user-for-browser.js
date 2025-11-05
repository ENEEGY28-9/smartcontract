import PocketBase from 'pocketbase';

async function createTestUserForBrowser() {
    const pb = new PocketBase('http://127.0.0.1:8090');

    try {
        console.log('👤 Creating test user for browser testing...\n');

        const testEmail = 'testuser@example.com';
        const testPassword = 'testpassword123';

        // Check if user already exists
        console.log('🔍 Checking if test user exists...');
        try {
            const existingUsers = await pb.collection('users').getList(1, 10, {
                filter: `email = "${testEmail}"`
            });

            if (existingUsers.items.length > 0) {
                console.log('✅ Test user already exists!');
                const user = existingUsers.items[0];
                console.log(`Email: ${user.email}`);
                console.log(`ID: ${user.id}`);

                // Try to login
                console.log('\n🔑 Logging in test user...');
                await pb.collection('users').authWithPassword(testEmail, testPassword);
                console.log('✅ Login successful!');
                console.log('Token:', pb.authStore.token ? 'present' : 'missing');

                return { user: user, token: pb.authStore.token };
            }
        } catch (checkError) {
            console.log('⚠️ Could not check existing users, proceeding to create...');
        }

        // Create new user
        console.log('📝 Creating new test user...');
        const userRecord = await pb.collection('users').create({
            email: testEmail,
            password: testPassword,
            passwordConfirm: testPassword,
            name: 'Test User'
        });
        console.log('✅ Created test user:', userRecord.id, userRecord.email);

        // Authenticate
        console.log('\n🔑 Authenticating test user...');
        await pb.collection('users').authWithPassword(testEmail, testPassword);
        console.log('✅ Authentication successful!');

        console.log('\n📋 User credentials for browser testing:');
        console.log(`Email: ${testEmail}`);
        console.log(`Password: ${testPassword}`);
        console.log(`User ID: ${userRecord.id}`);
        console.log(`Token: ${pb.authStore.token ? 'present' : 'missing'}`);

        return { user: userRecord, token: pb.authStore.token };

    } catch (error) {
        console.error('❌ Error creating test user:', error);
        console.error('Full error:', error);
        throw error;
    }
}

createTestUserForBrowser();
