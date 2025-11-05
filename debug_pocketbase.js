// Debug PocketBase response format
import fetch from 'node-fetch';

async function debugPocketBase() {
  console.log('🔍 Debugging PocketBase response format...\n');

  try {
    // Test registration
    console.log('1. Testing PocketBase registration...');
    const registerResponse = await fetch('http://localhost:8090/api/collections/users/records', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: `debug-${Date.now()}@example.com`,
        password: 'testpassword123',
        passwordConfirm: 'testpassword123',
        name: 'DebugUser'
      })
    });

    const registerData = await registerResponse.json();
    console.log('Registration response:', JSON.stringify(registerData, null, 2));

    if (!registerResponse.ok) {
      console.log('❌ Registration failed');
      return;
    }

    // Test login
    console.log('\n2. Testing PocketBase login...');
    const loginResponse = await fetch('http://localhost:8090/api/collections/users/auth-with-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identity: registerData.email || registerData.username,
        password: 'testpassword123'
      })
    });

    const loginData = await loginResponse.json();
    console.log('Login response:', JSON.stringify(loginData, null, 2));

    if (loginResponse.ok && loginData.token) {
      console.log('\n3. Testing token refresh...');
      const refreshResponse = await fetch('http://localhost:8090/api/collections/users/auth-refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${loginData.token}`,
        }
      });

      const refreshData = await refreshResponse.json();
      console.log('Refresh response:', JSON.stringify(refreshData, null, 2));

    console.log('\n4. Testing Gateway with PocketBase token...');

    // First test direct PocketBase auth-refresh to make sure token is valid
    console.log('4a. Testing PocketBase token validity...');
    const pbRefresh = await fetch('http://localhost:8090/api/collections/users/auth-refresh', {
      method: 'POST',  // Try POST method
      headers: {
        'Authorization': `Bearer ${loginData.token}`,
      }
    });

    if (pbRefresh.ok) {
      console.log('✅ PocketBase token is valid');
    } else {
      console.log('❌ PocketBase token is invalid:', pbRefresh.status);
      const error = await pbRefresh.text();
      console.log('Error:', error);
    }

    // Now test Gateway
    console.log('4b. Testing Gateway with PocketBase token...');
    const gatewayResponse = await fetch('http://localhost:8080/api/token/balance', {
      headers: {
        'Authorization': `Bearer ${loginData.token}`,
      }
    });

    console.log('Gateway response status:', gatewayResponse.status);
    const gatewayData = await gatewayResponse.text();
    console.log('Gateway response:', gatewayData);

    // Decode JWT to understand structure
    console.log('\n5. Decoding JWT token...');
    const tokenParts = loginData.token.split('.');
    if (tokenParts.length === 3) {
      const header = JSON.parse(Buffer.from(tokenParts[0], 'base64').toString());
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());

      console.log('JWT Header:', header);
      console.log('JWT Payload:', payload);
    }
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugPocketBase();
