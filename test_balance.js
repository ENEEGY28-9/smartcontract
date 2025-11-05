import axios from 'axios';

const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicm9sZSI6InVzZXIiLCJleHAiOjIwMDAwMDAwMDAsImlhdCI6MTAwMDAwMDAwMCwiaXNzIjoidGVzdCJ9.abc123';

(async () => {
  try {
    console.log('Testing balance endpoint...');
    const response = await axios.get('http://localhost:8080/api/wallet/balance', {
      headers: { 'Authorization': `Bearer ${jwt}` },
      timeout: 10000
    });
    console.log('✅ Balance check successful:', response.data);
  } catch (error) {
    console.log('❌ Balance check failed:', error.message);
    if (error.code) console.log('Error code:', error.code);
  }
})();
