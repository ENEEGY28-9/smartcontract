// Create a user with longer password for testing
import PocketBase from 'pocketbase';

const POCKETBASE_URL = 'http://localhost:8090';
const pb = new PocketBase(POCKETBASE_URL);

async function createWorkingUser() {
    console.log('🚀 Creating user with proper password...');

    try {
        // Create user with longer password
        const userRecord = await pb.collection('users').create({
            email: 'working@example.com',
            password: 'working123456', // 13 characters
            passwordConfirm: 'working123456',
            name: 'Working User'
        });
        console.log('✅ User created:', userRecord.email);

        // Test authentication
        await pb.collection('users').authWithPassword('working@example.com', 'working123456');
        console.log('✅ Authentication successful');

        console.log('\n📋 WORKING CREDENTIALS:');
        console.log('Email: working@example.com');
        console.log('Password: working123456');
        console.log('\n🔗 Use these in the wallet test app');

    } catch (error) {
        console.error('❌ Failed:', error.message);
    }
}

createWorkingUser();
