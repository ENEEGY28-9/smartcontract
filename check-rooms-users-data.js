import PocketBase from 'pocketbase';

async function checkRoomsUsersData() {
    const pb = new PocketBase('http://127.0.0.1:8090');

    try {
        console.log('🔍 Checking rooms and users data consistency...\n');

        // First, let's get all users
        const users = await pb.collection('users').getList(1, 100);
        console.log(`📋 Found ${users.items.length} users:`);
        users.items.forEach(user => {
            console.log(`  - ${user.id}: ${user.name || user.email} (${user.email})`);
        });
        console.log('');

        // Get all rooms
        const rooms = await pb.collection('rooms').getList(1, 100, {
            sort: '-created'
        });
        console.log(`🏠 Found ${rooms.items.length} rooms:`);
        rooms.items.forEach(room => {
            console.log(`  - ${room.id}: "${room.name}"`);
            console.log(`    Status: ${room.status}`);
            console.log(`    Owner ID: ${room.owner_id}`);
            console.log(`    Members: ${JSON.stringify(room.members || [])}`);
            console.log(`    Created: ${room.created}`);

            // Check if owner_id exists in users
            const ownerExists = users.items.some(user => user.id === room.owner_id);
            console.log(`    Owner exists in users: ${ownerExists ? '✅' : '❌'}`);

            if (!ownerExists && room.owner_id) {
                console.log(`    ❌ PROBLEM: Owner ${room.owner_id} not found in users table!`);
            }

            // Check if all members exist in users
            if (room.members && Array.isArray(room.members)) {
                room.members.forEach(memberId => {
                    const memberExists = users.items.some(user => user.id === memberId);
                    if (!memberExists) {
                        console.log(`    ❌ PROBLEM: Member ${memberId} not found in users table!`);
                    }
                });
            }

            console.log('');
        });

        // Now check for rooms created by each user
        console.log('🔗 Checking rooms ownership per user:');
        users.items.forEach(user => {
            const userRooms = rooms.items.filter(room => room.owner_id === user.id);
            console.log(`  ${user.name || user.email} (${user.id}): ${userRooms.length} rooms`);

            userRooms.forEach(room => {
                console.log(`    - ${room.name} (${room.status}) - Created: ${room.created}`);
            });
        });

        // Check if there are any orphaned rooms
        const orphanedRooms = rooms.items.filter(room => {
            return room.owner_id && !users.items.some(user => user.id === room.owner_id);
        });

        if (orphanedRooms.length > 0) {
            console.log('\n🚨 ORPHANED ROOMS DETECTED:');
            console.log(`Found ${orphanedRooms.length} rooms with non-existent owners:`);
            orphanedRooms.forEach(room => {
                console.log(`  - Room "${room.name}" (${room.id}) - Owner: ${room.owner_id}`);
            });

            console.log('\n💡 RECOMMENDATION: These rooms should be cleaned up or owners should be recreated.');
        } else {
            console.log('\n✅ No orphaned rooms found.');
        }

    } catch (error) {
        console.error('❌ Error checking data:', error);
        console.error('Full error:', error);
    }
}

checkRoomsUsersData();
