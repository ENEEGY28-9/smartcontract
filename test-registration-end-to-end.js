// Test registration end-to-end through the web interface
const testRegistrationEndToEnd = async () => {
    console.log('🧪 Testing registration end-to-end...');

    try {
        // Test 1: Direct PocketBase API
        console.log('\n1. Testing direct PocketBase API...');
        const response1 = await fetch('http://localhost:8090/api/collections/users/records', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                email: 'direct' + Date.now() + '@example.com',
                password: 'test123456',
                passwordConfirm: 'test123456',
                name: 'Direct Test User'
            })
        });

        if (response1.ok) {
            console.log('✅ Direct API working');
        } else {
            console.log('❌ Direct API failed:', await response1.text());
        }

        // Test 2: Through proxy
        console.log('\n2. Testing through proxy...');
        const response2 = await fetch('http://localhost:5173/pb-api/api/collections/users/records', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                email: 'proxy' + Date.now() + '@example.com',
                password: 'test123456',
                passwordConfirm: 'test123456',
                name: 'Proxy Test User'
            })
        });

        if (response2.ok) {
            console.log('✅ Proxy API working');
        } else {
            console.log('❌ Proxy API failed:', await response2.text());
        }

        // Test 3: Check if client is responding
        console.log('\n3. Testing client response...');
        const response3 = await fetch('http://localhost:5173/wallet-test', {
            method: 'GET'
        });

        if (response3.ok) {
            console.log('✅ Client is responding');
            const html = await response3.text();
            if (html.includes('Wallet Test')) {
                console.log('✅ Wallet Test page loaded successfully');
            } else {
                console.log('❌ Wallet Test page not loaded properly');
            }
        } else {
            console.log('❌ Client not responding:', response3.status);
        }

    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
};

testRegistrationEndToEnd();
