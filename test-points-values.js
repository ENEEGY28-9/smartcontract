// Test different points values
async function testPointsValues() {
    try {
        console.log('🔍 Testing different points values...');

        // Authenticate
        const authResponse = await fetch('http://localhost:8090/api/admins/auth-with-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                identity: 'admin@example.com',
                password: 'admin123456'
            })
        });

        const authData = await authResponse.json();
        const token = authData.token;

        // Test different points values
        const testPoints = [1, 10, 100, 0, -1, '0', null];

        for (const points of testPoints) {
            console.log(`\n🧪 Testing points: ${points} (type: ${typeof points})`);

            const testData = {
                user_id: 'g23km3kmg1d21ia', // Test user ID
                points: points
            };

            console.log('Data:', JSON.stringify(testData));

            const response = await fetch('http://localhost:8090/api/collections/energies/records', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(testData)
            });

            console.log(`Status: ${response.status}`);

            if (response.ok) {
                const result = await response.json();
                console.log(`✅ Success! ID: ${result.id}`);

                // Clean up
                await fetch(`http://localhost:8090/api/collections/energies/records/${result.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                console.log('🗑️ Cleaned up test record');
            } else {
                const error = await response.text();
                console.log(`❌ Failed: ${error}`);
            }
        }

    } catch (error) {
        console.log('❌ Test error:', error.message);
    }
}

testPointsValues();
