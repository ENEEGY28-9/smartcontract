import PocketBase from 'pocketbase/cjs';

const pb = new PocketBase('http://localhost:8090');

async function testFullShopBagFlow() {
    try {
        console.log('🛒 Testing full shop -> bag flow...');

        // Login
        await pb.collection('users').authWithPassword('working@example.com', 'working123456');
        console.log('✅ Login successful');

        const userId = pb.authStore.model.id;

        // Check initial inventory
        console.log('\n1️⃣ Initial inventory check...');
        const initialItems = await pb.collection('items').getList(1, 100, {
            filter: `user_id = "${userId}"`
        });
        console.log('📊 Initial items:', initialItems.items.length);

        // Simulate purchasing an item (like the shop would do)
        console.log('\n2️⃣ Simulating purchase of "boost_pack"...');
        const purchasedItem = await pb.collection('items').create({
            user_id: userId,
            item_id: 'boost_pack',
            item_name: 'Boost Pack',
            category: 'powerups',
            icon: '🚀',
            quantity: 1,
            purchase_price: 50,
            purchased_at: new Date().toISOString()
        });
        console.log('✅ Item purchased and saved to inventory:', purchasedItem.item_name);

        // Check inventory after purchase
        console.log('\n3️⃣ Checking inventory after purchase...');
        const afterPurchaseItems = await pb.collection('items').getList(1, 100, {
            filter: `user_id = "${userId}"`
        });
        console.log('📊 Items after purchase:', afterPurchaseItems.items.length);
        afterPurchaseItems.items.forEach((item, index) => {
            console.log(`   ${index + 1}. ${item.item_name} (${item.category}) - Quantity: ${item.quantity}`);
        });

        // Simulate bag page loading (what bag page would do)
        console.log('\n4️⃣ Simulating bag page load...');
        const bagItems = afterPurchaseItems.items.map(item => ({
            id: item.item_id,
            name: item.item_name,
            category: item.category,
            icon: item.icon,
            price: item.purchase_price,
            quantity: item.quantity
        }));
        console.log('📦 Bag would show:', bagItems.length, 'items');
        bagItems.forEach((item, index) => {
            console.log(`   ${index + 1}. ${item.icon} ${item.name} - ${item.category}`);
        });

        // Clean up
        console.log('\n5️⃣ Cleaning up test data...');
        await pb.collection('items').delete(purchasedItem.id);
        console.log('✅ Test item removed');

        console.log('\n🎯 Full shop -> bag flow test completed successfully! ✅');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Full error:', error);
    }
}

testFullShopBagFlow();

