// Script to create a new admin user in PocketBase
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function createAdminUser() {
  try {
    console.log('🔍 Checking if PocketBase is accessible...');

    // First try to get health check
    const healthResponse = await fetch('http://127.0.0.1:8090/api/health');
    if (!healthResponse.ok) {
      throw new Error('PocketBase is not running or not accessible');
    }

    console.log('✅ PocketBase is running');

    // Try to check if there are any existing admins
    try {
      const adminsResponse = await fetch('http://127.0.0.1:8090/api/admins');
      const admins = await adminsResponse.json();
      console.log(`📊 Found ${admins.length} existing admin(s)`);

      if (admins.length > 0) {
        console.log('ℹ️ Admin users already exist. Use one of these to login:');
        admins.forEach(admin => {
          console.log(`   - Email: ${admin.email}`);
        });
        return;
      }
    } catch (error) {
      console.log('ℹ️ No existing admins found, will create new one');
    }

    // Create new admin user
    console.log('🆕 Creating new admin user...');

    const newAdminData = {
      email: 'admin@pocketbase.local',
      password: '123456789',
      passwordConfirm: '123456789'
    };

    const createResponse = await fetch('http://127.0.0.1:8090/api/admins', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newAdminData)
    });

    if (createResponse.ok) {
      const admin = await createResponse.json();
      console.log('✅ Admin user created successfully!');
      console.log('📧 Email: admin@pocketbase.local');
      console.log('🔑 Password: 123456789');
      console.log('\n🔗 You can now login at: http://127.0.0.1:8090/_/');
    } else {
      const error = await createResponse.json();
      console.error('❌ Failed to create admin:', error);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createAdminUser();












