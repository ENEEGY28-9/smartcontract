import PocketBase from 'pocketbase/cjs';

const pb = new PocketBase('http://localhost:8090');

async function testShopItemsLoading() {
    try {
        console.log('🔐 Logging in to test shop items loading...');

        await pb.collection('users').authWithPassword('working@example.com', 'working123456');
        console.log('✅ Login successful');

        console.log('\n🛒 Testing shop items loading...');

        // Test getShopItems function
        console.log('1️⃣ Getting all enabled shop items...');
        const shopItems = await pb.collection('shop_items').getList(1, 100, {
            filter: 'is_enabled = true',
            sort: 'sort_order,created'
        });

        console.log('📊 Found', shopItems.items.length, 'enabled shop items');

        if (shopItems.items.length > 0) {
            console.log('\n📋 Shop items list:');
            shopItems.items.forEach((item, index) => {
                console.log(`${index + 1}. ${item.icon} ${item.name} - ${item.price}E (${item.category})`);
                console.log(`   ID: ${item.item_id}, Enabled: ${item.is_enabled}, Sort: ${item.sort_order}`);
            });
        }

        // Test getting specific item
        if (shopItems.items.length > 0) {
            console.log('\n2️⃣ Testing get specific item by item_id...');
            const firstItem = shopItems.items[0];
            const specificItem = await pb.collection('shop_items').getList(1, 1, {
                filter: `item_id = "${firstItem.item_id}" && is_enabled = true`
            });

            if (specificItem.items.length > 0) {
                console.log('✅ Successfully retrieved item:', specificItem.items[0].name);
            } else {
                console.log('❌ Failed to retrieve specific item');
            }
        }

        console.log('\n🎯 Shop items loading test completed successfully! ✅');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Full error:', error);
    }
}

testShopItemsLoading();

