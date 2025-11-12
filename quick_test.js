// Quick test for JWT compatibility
import fetch from 'node-fetch';

async function quickTest() {
  console.log('🚀 Quick JWT Compatibility Test...\n');

  // Test 1: Health check
  try {
    const health = await fetch('http://localhost:8080/healthz');
    console.log('✅ Gateway health:', health.status);
  } catch (e) {
    console.log('❌ Gateway not responding');
    return;
  }

  // Test 2: Balance endpoint without auth
  try {
    const noAuth = await fetch('http://localhost:8080/api/token/balance');
    console.log('✅ No auth response:', noAuth.status);
  } catch (e) {
    console.log('❌ Balance endpoint error:', e.message);
  }

  // Test 3: Balance endpoint with invalid token
  try {
    const invalid = await fetch('http://localhost:8080/api/token/balance', {
      headers: { 'Authorization': 'Bearer invalid-token' }
    });
    console.log('✅ Invalid token response:', invalid.status);
    const text = await invalid.text();
    console.log('Response:', text);
  } catch (e) {
    console.log('❌ Invalid token test error:', e.message);
  }

  console.log('\n🎯 Test complete!');
}

quickTest();










