import PocketBase from 'pocketbase/cjs';

const pb = new PocketBase('http://localhost:8090');

async function debugShopOwnedIssue() {
    try {
        console.log('🔍 Debugging shop owned issue...');

        // Login
        await pb.collection('users').authWithPassword('working@example.com', 'working123456');
        console.log('✅ Login successful');

        const userId = pb.authStore.model.id;
        console.log('👤 User ID:', userId);

        console.log('\n1️⃣ Checking database inventory...');
        const dbInventory = await pb.collection('items').getList(1, 100, {
            filter: `user_id = "${userId}"`
        });
        console.log('📊 Database inventory:', dbInventory.items.length, 'items');

        console.log('\n2️⃣ Checking localStorage (if accessible)...');
        // Note: This will show empty in Node.js, but in browser it would check localStorage
        console.log('⚠️ Note: localStorage check only works in browser environment');

        console.log('\n3️⃣ Checking shop items...');
        const shopItems = await pb.collection('shop_items').getList(1, 100, {
            filter: 'is_enabled = true',
            sort: 'sort_order,created'
        });
        console.log('📊 Shop items:', shopItems.items.length, 'enabled items');

        console.log('\n4️⃣ Analyzing the issue...');

        if (dbInventory.items.length === 0) {
            console.log('✅ Database shows no items owned - all shop items should be available');
            console.log('❓ If user sees "Owned" items, it might be due to:');
            console.log('   - Old localStorage data from before database migration');
            console.log('   - Browser cache issues');
            console.log('   - User viewing on different device/session');
            console.log('   - Authentication state not properly updated');
        } else {
            console.log('📋 User owns these items in database:');
            dbInventory.items.forEach((item, index) => {
                console.log(`   ${index + 1}. ${item.item_name} (${item.item_id}) - should show "✓ Owned"`);
            });
        }

        console.log('\n💡 Recommended solutions:');
        console.log('1. Clear browser localStorage for the domain');
        console.log('2. Hard refresh (Ctrl+F5) the shop page');
        console.log('3. Check if user is properly authenticated');
        console.log('4. Verify shop page is loading from database correctly');

        console.log('\n🔧 If issue persists, check browser console for errors when loading shop page');

    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        console.error('Full error:', error);
    }
}

debugShopOwnedIssue();

