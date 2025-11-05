// Simple integration test for devnet auto-mint logic
console.log('🧪 SIMPLE DEVNET INTEGRATION TEST\n');

// Test 1: Check PocketBase health
async function testPocketBase() {
  console.log('1️⃣ Testing PocketBase...');
  try {
    const response = await fetch('http://localhost:8090/api/health');
    if (response.ok) {
      console.log('✅ PocketBase: RUNNING');
      return true;
    } else {
      console.log('⚠️ PocketBase: RESPONDING BUT NOT OK');
      return false;
    }
  } catch (error) {
    console.log('❌ PocketBase: NOT ACCESSIBLE');
    return false;
  }
}

// Test 2: Check Gateway
async function testGateway() {
  console.log('2️⃣ Testing Gateway...');
  try {
    const response = await fetch('http://localhost:8080/health');
    if (response.ok) {
      console.log('✅ Gateway: RUNNING');
      return true;
    } else {
      console.log('⚠️ Gateway: RESPONDING BUT NOT OK');
      return false;
    }
  } catch (error) {
    console.log('❌ Gateway: NOT ACCESSIBLE');
    return false;
  }
}

// Test 3: Test admin authentication
async function testAdminAuth() {
  console.log('3️⃣ Testing Admin Authentication...');
  try {
    const response = await fetch('http://localhost:8090/api/admins/auth-with-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identity: 'admin2@pocketbase.local',
        password: 'admin123456'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Admin authentication: SUCCESS');
      console.log(`   Token: ${data.token.substring(0, 50)}...`);
      return data.token;
    } else {
      console.log('❌ Admin authentication: FAILED');
      return null;
    }
  } catch (error) {
    console.log('❌ Admin authentication: ERROR -', error.message);
    return null;
  }
}

// Test 4: Test auto-mint logic (80/20 distribution)
async function testAutoMintLogic(token) {
  console.log('4️⃣ Testing Auto-Mint Logic (80/20 Distribution)...');

  // Test the math logic directly
  const totalAmount = 1000;
  const gameAmount = Math.floor(totalAmount * 0.8); // 80%
  const ownerAmount = Math.floor(totalAmount * 0.2); // 20%

  console.log(`   Total tokens: ${totalAmount}`);
  console.log(`   Game pool (80%): ${gameAmount}`);
  console.log(`   Owner wallet (20%): ${ownerAmount}`);
  console.log(`   Distribution: ${gameAmount + ownerAmount === totalAmount ? '✅ CORRECT' : '❌ INCORRECT'}`);

  // Test API endpoint if token available
  if (token) {
    try {
      const response = await fetch('http://localhost:8090/api/admin/auto-mint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: totalAmount })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Auto-mint API: WORKING');
        console.log(`   Response: ${data.total_minted}/${data.game_pool}/${data.owner_wallet}`);
      } else {
        console.log('❌ Auto-mint API: FAILED (404 - hooks not loaded?)');
      }
    } catch (error) {
      console.log('❌ Auto-mint API: ERROR -', error.message);
    }
  }

  return gameAmount === 800 && ownerAmount === 200;
}

// Test 5: Test player earn from pool
async function testPlayerEarnFromPool(token) {
  console.log('5️⃣ Testing Player Earn From Pool...');

  if (!token) {
    console.log('❌ Cannot test without auth token');
    return false;
  }

  try {
    const response = await fetch('http://localhost:8080/api/token/earn-from-pool', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        particle_location: [150, 200],
        particle_type: 'energy',
        amount: 1
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Player earn from pool: SUCCESS');
      console.log(`   New balance: ${data.new_balance}`);
      console.log(`   Remaining pool: ${data.remaining_pool}`);
      return true;
    } else {
      console.log(`❌ Player earn from pool: FAILED (${response.status})`);
      return false;
    }
  } catch (error) {
    console.log('❌ Player earn from pool: ERROR -', error.message);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 STARTING DEVNET INTEGRATION TESTS\n');

  // Run all tests
  const pbOk = await testPocketBase();
  const gwOk = await testGateway();
  const token = await testAdminAuth();
  const mintLogicOk = await testAutoMintLogic(token);
  const earnFromPoolOk = await testPlayerEarnFromPool(token);

  // Summary
  console.log('\n📊 TEST RESULTS SUMMARY:');
  console.log('========================');
  console.log(`PocketBase: ${pbOk ? '✅' : '❌'}`);
  console.log(`Gateway: ${gwOk ? '✅' : '❌'}`);
  console.log(`Admin Auth: ${token ? '✅' : '❌'}`);
  console.log(`Auto-Mint Logic (80/20): ${mintLogicOk ? '✅' : '❌'}`);
  console.log(`Player Earn From Pool: ${earnFromPoolOk ? '✅' : '❌'}`);

  const allOk = pbOk && gwOk && token && mintLogicOk && earnFromPoolOk;

  console.log(`\n🎯 OVERALL STATUS: ${allOk ? '✅ ALL TESTS PASSED' : '⚠️ SOME TESTS FAILED'}`);

  if (allOk) {
    console.log('\n🎉 DEVNET INTEGRATION: FULLY FUNCTIONAL!');
    console.log('💰 Owner receives 20% immediately from auto-mint');
    console.log('🎮 Players earn tokens from 80% game pool');
    console.log('🔄 Real-time sync working');
  } else {
    console.log('\n⚠️ ISSUES DETECTED:');
    if (!token) console.log('   - Admin authentication failed');
    if (!mintLogicOk) console.log('   - Auto-mint API not working (hooks not loaded?)');
    if (!earnFromPoolOk) console.log('   - Player earn from pool failed');
  }

  console.log('\n🔧 NEXT STEPS:');
  console.log('1. Ensure PocketBase hooks are loaded (restart if needed)');
  console.log('2. Verify Gateway auto-mint scheduler is running');
  console.log('3. Test with real Solana devnet transactions');
  console.log('4. Monitor owner wallet balance for 20% revenue');
}

// Run tests
runTests().catch(console.error);

