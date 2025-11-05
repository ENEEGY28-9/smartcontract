const POCKETBASE_URL = 'http://localhost:5173/pb-api';

async function testUserAccess() {
    try {
        console.log('Testing user access to rooms...');

        // Use the token we got from the direct test
        const userToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb2xsZWN0aW9uSWQiOiJfcGJfdXNlcnNfYXV0aF8iLCJleHAiOjE3NjMxNzM2MzQsImlkIjoidmp5dTE1emlic2h4ZWtlIiwidHlwZSI6ImF1dGhSZWNvcmQifQ.NyStml-aPz1a3xn1bniN7y-TvLyE8KWTyqfzzZAYwHk';

        console.log('✅ User authenticated successfully');

        // Test listing rooms
        const listResponse = await fetch(`${POCKETBASE_URL}/api/collections/rooms/records`, {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });

        if (listResponse.ok) {
            const roomsData = await listResponse.json();
            console.log(`✅ User can list rooms: ${roomsData.items.length} rooms found`);

            // Test creating a room
            const createResponse = await fetch(`${POCKETBASE_URL}/api/collections/rooms/records`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}`
                },
                body: JSON.stringify({
                    name: 'Test Room by User',
                    description: 'Created by regular user',
                    max_members: 4,
                    status: 'waiting'
                })
            });

            if (createResponse.ok) {
                console.log('✅ User can create rooms');
            } else {
                const errorText = await createResponse.text();
                console.log(`❌ User cannot create rooms: ${createResponse.status} - ${errorText}`);
            }

        } else {
            const errorText = await listResponse.text();
            console.log(`❌ User cannot list rooms: ${listResponse.status} - ${errorText}`);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testUserAccess();
