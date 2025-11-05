import PocketBase from 'pocketbase/cjs';

const pb = new PocketBase('http://localhost:8090');

async function testFilter() {
    try {
        await pb.collection('users').authWithPassword('working@example.com', 'working123456');

        const userId = '6usf1c3iyjfko81';
        const filter = `owner_id = "${userId}" && (status = "waiting" || status = "playing")`;

        console.log('Filter:', filter);

        const rooms = await pb.collection('rooms').getList(1, 100, {
            sort: '-created',
            filter: filter
        });

        console.log('Filtered rooms for user:', rooms.items.length);
        rooms.items.forEach(r => console.log('-', r.id, r.name, r.status, r.owner_id));

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testFilter();

