import { Connection, PublicKey } from '@solana/web3.js';

const USER_WALLET = '4UkWvx2Y59XSuhaCfeYDS56RM1WcsSdgjJ7yzLEbMyNf';
const GAME_POOL = '5oU5mv3xjud2kgemjKwm5qK5Ar356rxboxbNmYXhuAJc';

async function checkCurrentBalance() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const balance = await connection.getBalance(new PublicKey(USER_WALLET));
  return balance / 1e9;
}

async function showFinalSolution() {
  console.log('🚀 FINAL SOLUTION - GET SOL FOR DEVNET WALLET\n');
  console.log('='.repeat(60));

  const currentBalance = await checkCurrentBalance();
  console.log('💰 CURRENT BALANCE: ' + currentBalance.toFixed(4) + ' SOL');

  if (currentBalance >= 1) {
    console.log('✅ WALLET ALREADY FUNDED!');
    console.log('🎉 Ready to test interactions!');
    return await runTests();
  }

  console.log('\n📋 MANUAL FUNDING STEPS:\n');

  console.log('🔥 METHOD 1 - QuickNode (FASTEST):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. 🌐 Open: https://faucet.quicknode.com/solana/devnet');
  console.log('2. 📝 Paste: ' + USER_WALLET);
  console.log('3. 🎯 Click: Send Devnet SOL');
  console.log('4. ⏳ Wait: 10-30 seconds');
  console.log('5. ✅ Balance will update automatically\n');

  console.log('🌐 METHOD 2 - Official Solana Faucet:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. 🌐 Open: https://faucet.solana.com/');
  console.log('2. 🌍 Select: Devnet from dropdown');
  console.log('3. 📝 Paste: ' + USER_WALLET);
  console.log('4. 🎯 Click: Request Airdrop');
  console.log('5. 📊 Select: 1 SOL');
  console.log('6. ⏳ Wait: 30-60 seconds\n');

  console.log('📱 METHOD 3 - Discord Bot:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. 🌐 Join: https://discord.gg/solana');
  console.log('2. 📺 Go to: #devnet-faucet channel');
  console.log('3. 💬 Type: $airdrop ' + USER_WALLET);
  console.log('4. 🤖 Bot sends 1-2 SOL\n');

  console.log('🔄 MONITORING BALANCE...');
  console.log('Keep this script running - it will detect when SOL arrives!\n');

  return await waitForFunding();
}

async function waitForFunding() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  let lastBalance = await checkCurrentBalance();
  let checks = 0;

  console.log('📊 BALANCE MONITOR:');
  console.log('─'.repeat(40));

  while (checks < 600) { // 10 minutes max
    await new Promise(resolve => setTimeout(resolve, 1000)); // Check every second

    try {
      const currentBalance = await checkCurrentBalance();

      if (currentBalance !== lastBalance) {
        const timestamp = new Date().toLocaleTimeString();
        const change = currentBalance - lastBalance;

        console.log(`${timestamp} | ${currentBalance.toFixed(4)} SOL | ${change > 0 ? '+' + change.toFixed(4) : change.toFixed(4)}`);

        if (currentBalance >= 0.5) { // Enough for basic transactions
          console.log('\n🎉 FUNDING DETECTED!');
          console.log('💰 New Balance: ' + currentBalance.toFixed(4) + ' SOL');
          console.log('✅ Ready for wallet interactions!\n');

          return await runTests();
        }

        lastBalance = currentBalance;
      }

      checks++;

      if (checks % 60 === 0) { // Every minute
        const minutes = checks / 60;
        console.log(`⏳ Still monitoring... (${minutes} minutes)`);
      }

    } catch (error) {
      console.error('❌ Balance check error:', error.message);
    }
  }

  console.log('\n⏰ MONITORING TIMEOUT');
  console.log('💡 Try funding again or run: node check_wallet_ready.js');
  return false;
}

async function runTests() {
  console.log('🧪 RUNNING WALLET INTERACTION TESTS...\n');

  try {
    // Import the test function
    const { checkWalletReady } = await import('./check_wallet_ready.js');
    await checkWalletReady();

    console.log('\n🚀 RUNNING FULL INTERACTION TEST...\n');

    // Import and run full test
    const { runFullTest } = await import('./full_interaction_test.js');
    await runFullTest();

    return true;

  } catch (error) {
    console.error('❌ Test error:', error.message);
    console.log('💡 Run manually: node full_interaction_test.js');
    return false;
  }
}

async function main() {
  console.log('🎮 ENERGYGAME - WALLET FUNDING & TESTING SUITE\n');

  const success = await showFinalSolution();

  if (success) {
    console.log('\n🎊 SUCCESS! WALLET INTERACTIONS WORKING!');
    console.log('🎮 Your E-to-SOL claims are now functional!');
    console.log('💡 Game users can now convert E to SOL tokens!');
  } else {
    console.log('\n📋 MANUAL STEPS TO COMPLETE:');
    console.log('1. Fund wallet using faucet links above');
    console.log('2. Run: node check_wallet_ready.js');
    console.log('3. Run: node full_interaction_test.js');
  }
}

main().catch(console.error);






