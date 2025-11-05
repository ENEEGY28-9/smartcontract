const POCKETBASE_URL = 'http://127.0.0.1:8090';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123456';

async function fixApiRules() {
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

        console.log('Current API rules:');
        console.log('List rule:', roomsCollection.listRule);
        console.log('View rule:', roomsCollection.viewRule);
        console.log('Create rule:', roomsCollection.createRule);
        console.log('Update rule:', roomsCollection.updateRule);
        console.log('Delete rule:', roomsCollection.deleteRule);

        // Update API rules to allow authenticated users
        const updatedRules = {
            ...roomsCollection,
            listRule: '', // Allow anyone to list rooms (public)
            viewRule: '', // Allow anyone to view rooms
            createRule: '@request.auth.id != ""', // Require authentication to create
            updateRule: '@request.auth.id != "" && (owner_id = @request.auth.id || @request.auth.isAdmin = true)', // Owner or admin can update
            deleteRule: '@request.auth.id != "" && (owner_id = @request.auth.id || @request.auth.isAdmin = true)' // Owner or admin can delete
        };

        console.log('\n📝 Updating API rules...');

        const updateResponse = await fetch(`${POCKETBASE_URL}/api/collections/${roomsCollection.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify(updatedRules)
        });

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            throw new Error(`Failed to update API rules: ${updateResponse.status} - ${errorText}`);
        }

        const updatedCollection = await updateResponse.json();
        console.log('✅ Successfully updated API rules!');
        console.log('\nNew API rules:');
        console.log('List rule:', updatedCollection.listRule);
        console.log('View rule:', updatedCollection.viewRule);
        console.log('Create rule:', updatedCollection.createRule);
        console.log('Update rule:', updatedCollection.updateRule);
        console.log('Delete rule:', updatedCollection.deleteRule);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

fixApiRules();

