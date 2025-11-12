import axios from 'axios';

const GATEWAY_URL = 'http://localhost:8080';

// Test data from previous successful registration
const userData = {
    user: {
        id: '6d5c4642-8f17-4df6-9e7a-b1aeeec484c8',
        email: 'test_jwt@example.com'
    },
    access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDVjNDY0Mi04ZjE3LTRkZjYtOWU3YS1iMWFlZWVjNDg0YzgiLCJlbWFpbCI6InRlc3RfanB0QGV4YW1wbGUuY29tIiwicm9sZSI6InVzZXIiLCJleHAiOjIwMDAwMDAwMDAsImlhdCI6MTAwMDAwMDAwMCwiaXNzIjoidGVzdCJ9.abcdef123456789' // Mock token for testing
};

console.log('🔍 DEBUGGING BALANCE ENDPOINT');
console.log('='.repeat(50));

// Test 1: Health check
console.log('\n🏥 Test 1: Gateway Health Check');
try {
    const healthResponse = await axios.get(`${GATEWAY_URL}/health`, { timeout: 5000 });
    console.log('✅ Gateway health:', healthResponse.data.status);
} catch (error) {
    console.log('❌ Gateway health check failed:', error.message);
}

// Test 2: Direct balance API call
console.log('\n💰 Test 2: Balance API Call');
try {
    console.log('Making request to:', `${GATEWAY_URL}/api/token/balance`);
    console.log('With token length:', userData.access_token.length);

    const balanceResponse = await axios.get(`${GATEWAY_URL}/api/token/balance`, {
        headers: {
            'Authorization': `Bearer ${userData.access_token}`
        },
        timeout: 30000 // 30 second timeout for debugging
    });

    console.log('✅ Balance response received:');
    console.log('Status:', balanceResponse.status);
    console.log('Data:', JSON.stringify(balanceResponse.data, null, 2));

} catch (error) {
    console.log('❌ Balance request failed:');
    console.log('Error message:', error.message);
    console.log('Error code:', error.code);
    console.log('Response status:', error.response?.status);
    console.log('Response data:', error.response?.data);
}

// Test 3: Test with invalid token
console.log('\n🔐 Test 3: Balance with Invalid Token');
try {
    const invalidResponse = await axios.get(`${GATEWAY_URL}/api/token/balance`, {
        headers: {
            'Authorization': 'Bearer invalid_token'
        },
        timeout: 10000
    });
    console.log('Unexpected success with invalid token');
} catch (error) {
    console.log('✅ Expected error with invalid token:', error.response?.status);
}

console.log('\n🔚 DEBUG COMPLETE');










