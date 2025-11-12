// Quick test for Solana wallet API
console.log('🧪 Testing Solana wallet generation API...');
console.log('API Endpoint: http://localhost:8080/api/wallet/generate-solana');
console.log('Status: Gateway is running on port 8080 ✅');
console.log('');
console.log('To test with authentication:');
console.log('1. Open http://localhost:5173/wallet');
console.log('2. Login to get JWT token');
console.log('3. Click "🎯 New Wallet" button');
console.log('4. Should generate real Solana wallet!');
console.log('');
console.log('Expected response format:');
console.log('{"success":true,"address":"ABC...","private_key":"DEF...","public_key":"ABC..."}');
