import PocketBase from 'pocketbase/cjs';

const pb = new PocketBase('http://localhost:8090');

async function testShopOwnedLogic() {
    try {
        console.log('🛒 Testing shop owned logic...');

        // Login
        await pb.collection('users').authWithPassword('working@example.com', 'working123456');
        console.log('✅ Login successful');

        const userId = pb.authStore.model.id;

        console.log('\n1️⃣ Checking current inventory...');
        const inventory = await pb.collection('items').getList(1, 100, {
            filter: `user_id = "${userId}"`
        });
        console.log('📊 User has', inventory.items.length, 'items in inventory');

        if (inventory.items.length > 0) {
            console.log('📋 Owned items:');
            inventory.items.forEach((item, index) => {
                console.log(`   ${index + 1}. ${item.item_name} (${item.item_id})`);
            });
        }

        console.log('\n2️⃣ Checking shop items...');
        const shopItems = await pb.collection('shop_items').getList(1, 100, {
            filter: 'is_enabled = true',
            sort: 'sort_order,created'
        });
        console.log('📊 Shop has', shopItems.items.length, 'enabled items');

        console.log('\n3️⃣ Simulating shop page logic...');
        // Extract item IDs from inventory (this is what shop page should do)
        const ownedItemIds = inventory.items.map(item => item.item_id);
        console.log('📊 Owned item IDs:', ownedItemIds);

        console.log('\n📋 Shop items status:');
        shopItems.items.forEach((item, index) => {
            const isOwned = ownedItemIds.includes(item.item_id);
            const status = isOwned ? '✓ OWNED' : '🛒 AVAILABLE';
            console.log(`   ${index + 1}. ${item.icon} ${item.name} - ${status}`);
        });

        console.log('\n🎯 Shop owned logic test completed!');

        if (inventory.items.length === 0) {
            console.log('💡 Note: User has no items, so all shop items should show as available');
        } else {
            console.log('💡 Note: Items marked as OWNED should not be purchasable again');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Full error:', error);
    }
}

testShopOwnedLogic();

