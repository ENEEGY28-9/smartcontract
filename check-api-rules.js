const POCKETBASE_URL = 'http://127.0.0.1:8090';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123456';

async function checkApiRules() {
    try {
        console.log('🔐 Authenticating as admin...');
        const authResponse = await fetch(`${POCKETBASE_URL}/api/admins/auth-with-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                identity: ADMIN_EMAIL,
                password: ADMIN_PASSWORD
            })
        });

        if (!authResponse.ok) {
            throw new Error(`Authentication failed: ${authResponse.status}`);
        }

        const authData = await authResponse.json();
        const adminToken = authData.token;

        const collectionsResponse = await fetch(`${POCKETBASE_URL}/api/collections`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (!collectionsResponse.ok) {
            throw new Error(`Failed to fetch collections: ${collectionsResponse.status}`);
        }

        const collectionsData = await collectionsResponse.json();
        const roomsCollection = collectionsData.items.find(col => col.name === 'rooms');

        if (!roomsCollection) {
            throw new Error('Rooms collection not found');
        }

        console.log('Rooms collection API rules:');
        console.log('List rule:', roomsCollection.listRule);
        console.log('View rule:', roomsCollection.viewRule);
        console.log('Create rule:', roomsCollection.createRule);
        console.log('Update rule:', roomsCollection.updateRule);
        console.log('Delete rule:', roomsCollection.deleteRule);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkApiRules();

