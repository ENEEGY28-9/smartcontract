import PocketBase from 'pocketbase/cjs';

const pb = new PocketBase('http://localhost:8090');

async function testInventorySystem() {
    try {
        console.log('🔐 Logging in to test inventory system...');

        await pb.collection('users').authWithPassword('working@example.com', 'working123456');
        console.log('✅ Login successful');

        const userId = pb.authStore.model.id;
        console.log('👤 User ID:', userId);

        console.log('\n📦 Testing inventory system...');

        // Check initial inventory
        console.log('1️⃣ Checking initial inventory...');
        const initialInventory = await pb.collection('items').getList(1, 100, {
            filter: `user_id = "${userId}"`
        });
        console.log('📊 Initial inventory:', initialInventory.items.length, 'items');

        // Add test item
        console.log('\n2️⃣ Adding test item to inventory...');
        const testItem = await pb.collection('items').create({
            user_id: userId,
            item_id: 'test_boost_pack',
            item_name: 'Test Boost Pack',
            category: 'powerups',
            icon: '🚀',
            quantity: 1,
            purchase_price: 50,
            purchased_at: new Date().toISOString()
        });
        console.log('✅ Added test item:', testItem.item_name, '(ID:', testItem.id, ')');

        // Check inventory after adding
        console.log('\n3️⃣ Checking inventory after adding item...');
        const inventoryAfterAdd = await pb.collection('items').getList(1, 100, {
            filter: `user_id = "${userId}"`
        });
        console.log('📊 Inventory after add:', inventoryAfterAdd.items.length, 'items');

        // Check if user owns specific item
        console.log('\n4️⃣ Checking if user owns "test_boost_pack"...');
        const ownsItem = await pb.collection('items').getList(1, 1, {
            filter: `user_id = "${userId}" && item_id = "test_boost_pack"`
        });
        console.log('📊 User owns test item:', ownsItem.items.length > 0 ? 'YES' : 'NO');

        // Update quantity
        console.log('\n5️⃣ Updating item quantity to 3...');
        const updatedItem = await pb.collection('items').update(testItem.id, {
            quantity: 3
        });
        console.log('✅ Updated quantity to:', updatedItem.quantity);

        // Clean up - remove test item
        console.log('\n6️⃣ Cleaning up - removing test item...');
        await pb.collection('items').delete(testItem.id);
        console.log('✅ Test item removed');

        // Final check
        console.log('\n7️⃣ Final inventory check...');
        const finalInventory = await pb.collection('items').getList(1, 100, {
            filter: `user_id = "${userId}"`
        });
        console.log('📊 Final inventory:', finalInventory.items.length, 'items');

        console.log('\n🎯 Inventory system test completed successfully! ✅');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Full error:', error);
    }
}

testInventorySystem();

