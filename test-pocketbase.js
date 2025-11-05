import PocketBase from 'pocketbase/cjs';

const pb = new PocketBase('http://localhost:8090');

async function testPocketBase() {
    try {
        console.log('🔍 Testing PocketBase connection...');

        // Test health check
        const health = await pb.health.check();
        console.log('✅ Health check passed:', health);

        // Test getting collections
        const collections = await pb.collections.getFullList();
        console.log('✅ Collections found:', collections.length);

        // Test getting users (if any)
        try {
            const users = await pb.collection('users').getFullList();
            console.log('✅ Users found:', users.length);
        } catch (error) {
            console.log('⚠️ No users or auth required');
        }

        // Test getting rooms (if any)
        try {
            const rooms = await pb.collection('rooms').getFullList();
            console.log('✅ Rooms found:', rooms.length);
        } catch (error) {
            console.log('⚠️ No rooms or access denied');
        }

        console.log('🎉 PocketBase is working correctly!');

    } catch (error) {
        console.error('❌ PocketBase error:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Make sure PocketBase is running: cd pocketbase && ./pocketbase.exe serve');
        console.log('2. Check if port 8090 is available');
        console.log('3. Try restarting PocketBase');
    }
}

testPocketBase();

