const axios = require('axios');

async function testAPI() {
    try {
        console.log('🧪 Testing Solana wallet generation API...');

        const response = await axios.post('http://localhost:8080/api/wallet/generate-solana', {}, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ API Response:', response.data);

    } catch (error) {
        console.error('❌ API Error:', error.response?.data || error.message);
        console.log('Status:', error.response?.status);
    }
}

testAPI();
