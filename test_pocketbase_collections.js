// Test script to check PocketBase collections and token validation
import axios from 'axios';

const POCKETBASE_URL = 'http://localhost:8090';
const ADMIN_EMAIL = 'admin2@pocketbase.local';
const ADMIN_PASSWORD = 'admin123456';

async function testPocketBase() {
    try {
        console.log('🔍 Testing PocketBase connection...');

        // Authenticate as admin
        const authResponse = await axios.post(`${POCKETBASE_URL}/api/admins/auth-with-password`, {
            identity: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });

        const adminToken = authResponse.data.token;
        console.log('✅ Admin authentication successful');

        // Check collections
        const collectionsResponse = await axios.get(`${POCKETBASE_URL}/api/collections`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        const collections = collectionsResponse.data;
        console.log('📋 Available collections:');
        collections.forEach(collection => {
            console.log(`  - ${collection.name}`);
        });

        // Check if token_blacklist collection exists
        const tokenBlacklistCollection = collections.find(c => c.name === 'token_blacklist');
        if (tokenBlacklistCollection) {
            console.log('✅ token_blacklist collection exists');

            // Try to query it
            const blacklistResponse = await axios.get(`${POCKETBASE_URL}/api/collections/token_blacklist/records`, {
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });
            console.log(`📊 Token blacklist records: ${blacklistResponse.data.items.length}`);
        } else {
            console.log('❌ token_blacklist collection does NOT exist');
        }

        // Test user registration and token flow
        console.log('\n🔐 Testing user registration...');
        const registerResponse = await axios.post(`${POCKETBASE_URL}/api/collections/users/records`, {
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123',
            passwordConfirm: 'password123'
        });

        console.log('✅ User registration successful');

        // Test login
        console.log('🔑 Testing user login...');
        const loginResponse = await axios.post(`${POCKETBASE_URL}/api/collections/users/auth-with-password`, {
            identity: 'test@example.com',
            password: 'password123'
        });

        const userToken = loginResponse.data.token;
        console.log('✅ User login successful');

        // Test token validation (this is what the gateway does)
        console.log('🔍 Testing token validation...');
        const tokenDataResponse = await axios.get(`${POCKETBASE_URL}/api/collections/users/records`, {
            headers: {
                'Authorization': `Bearer ${userToken}`
            }
        });

        console.log('✅ Token validation successful');

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

testPocketBase();
