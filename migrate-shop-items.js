import PocketBase from 'pocketbase/cjs';

const pb = new PocketBase('http://localhost:8090');

// Existing shop items data (same as in shop page)
const shopItems = [
  {
    id: 'boost_pack',
    name: 'Boost Pack',
    description: 'Instant speed boost for 10 seconds',
    price: 50,
    icon: '🚀',
    category: 'powerups',
    sort_order: 1
  },
  {
    id: 'energy_refill',
    name: 'Energy Refill',
    description: 'Restore full energy instantly',
    price: 100,
    icon: '⚡',
    category: 'consumables',
    sort_order: 2
  },
  {
    id: 'pet_upgrade',
    name: 'Pet Upgrade',
    description: 'Make your pet glow brighter',
    price: 200,
    icon: '🐾',
    category: 'cosmetics',
    sort_order: 3
  },
  {
    id: 'skin_blue',
    name: 'Blue Player Skin',
    description: 'Change your character color to blue',
    price: 300,
    icon: '🔵',
    category: 'cosmetics',
    sort_order: 4
  },
  {
    id: 'skin_red',
    name: 'Red Player Skin',
    description: 'Change your character color to red',
    price: 300,
    icon: '🔴',
    category: 'cosmetics',
    sort_order: 5
  },
  {
    id: 'double_score',
    name: 'Double Score',
    description: 'Earn double points for 30 seconds',
    price: 150,
    icon: '💰',
    category: 'powerups',
    sort_order: 6
  },
  {
    id: 'shield',
    name: 'Shield',
    description: 'Protect against one obstacle hit',
    price: 75,
    icon: '🛡️',
    category: 'powerups',
    sort_order: 7
  },
  {
    id: 'pet_green',
    name: 'Green Pet',
    description: 'Change your pet color to green',
    price: 250,
    icon: '🟢',
    category: 'cosmetics',
    sort_order: 8
  },
  {
    id: 'energy_gloves',
    name: 'Energy Gloves',
    description: 'Shoot energy blasts to clear obstacles',
    price: 400,
    icon: '🧤',
    category: 'powerups',
    sort_order: 9
  },
  {
    id: 'boom',
    name: 'Boom',
    description: 'Explosive power-up for massive destruction',
    price: 350,
    icon: '💥',
    category: 'consumables',
    sort_order: 10
  },
  {
    id: 'hoverboard',
    name: 'Hoverboard',
    description: 'Ride on air with this futuristic board',
    price: 600,
    icon: '🛼',
    category: 'cosmetics',
    sort_order: 11
  },
  {
    id: 'spider_pet',
    name: 'Spider Pet',
    description: 'A loyal spider companion that follows you',
    price: 450,
    icon: '🕷️',
    category: 'cosmetics',
    sort_order: 12
  }
];

async function migrateShopItems() {
  try {
    console.log('🔐 Logging in as admin...');

    // Login with working user account
    await pb.collection('users').authWithPassword('working@example.com', 'working123456');
    console.log('✅ Admin login successful');

    console.log('\n📦 Checking existing shop items...');
    const existingItems = await pb.collection('shop_items').getFullList();
    console.log('📊 Found', existingItems.length, 'existing shop items');

    if (existingItems.length > 0) {
      console.log('⚠️ Shop items already exist, skipping migration');
      console.log('Existing items:');
      existingItems.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.name} (${item.item_id})`);
      });
      return;
    }

    console.log('\n🚀 Starting migration of', shopItems.length, 'shop items...');

    for (let i = 0; i < shopItems.length; i++) {
      const item = shopItems[i];
      console.log(`📝 Migrating ${i + 1}/${shopItems.length}: ${item.name}...`);

      try {
        const record = await pb.collection('shop_items').create({
          item_id: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          icon: item.icon,
          category: item.category,
          is_enabled: true,
          sort_order: item.sort_order
        });

        console.log(`✅ Created: ${record.name} (ID: ${record.id})`);
      } catch (error) {
        console.error(`❌ Failed to create ${item.name}:`, error.message);
      }

      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n🎯 Migration completed!');

    // Verify migration
    console.log('\n🔍 Verifying migration...');
    const migratedItems = await pb.collection('shop_items').getFullList();
    console.log('📊 Total shop items in database:', migratedItems.length);

    console.log('\n📋 Final shop items list:');
    migratedItems.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.icon} ${item.name} - ${item.price}E (${item.category})`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error.message);

    if (error.message.includes('auth')) {
      console.log('\n💡 Tip: Make sure admin user exists. You can create one at http://localhost:8090/_/');
      console.log('   Or update the login credentials in this script.');
    }
  }
}

migrateShopItems();
