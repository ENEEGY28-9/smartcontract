// Script to check which admin credentials work
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

const credentials = [
  { email: 'admin@pocketbase.local', password: '123456789' },
  { email: 'admin@pocketbase.local', password: 'eneegy123456' },
  { email: 'admin@example.com', password: 'admin123456' },
  { email: 'admin@pocketbase.com', password: 'admin123' },
  { email: 'admin@local.com', password: 'admin12345678' },
  { email: 'admin2@pocketbase.local', password: 'admin123456' }
];

async function testCredentials() {
  console.log('🔍 Testing admin credentials...\n');

  for (const cred of credentials) {
    try {
      console.log(`Testing: ${cred.email} / ${cred.password}`);
      await pb.admins.authWithPassword(cred.email, cred.password);
      console.log('✅ SUCCESS! Working credentials found:\n');
      console.log(`   Email: ${cred.email}`);
      console.log(`   Password: ${cred.password}\n`);
      return cred;
    } catch (error) {
      console.log(`❌ Failed: ${error.message}\n`);
    }
  }

  console.log('❌ No working credentials found. You may need to create a new admin user.');
}

testCredentials();
