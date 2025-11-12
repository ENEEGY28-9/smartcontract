import { Connection, PublicKey } from '@solana/web3.js';

const OWNER_WALLET = 'A1Tk1KLSkH4dbeS1mKv9CrUKVRuErHGBg6oH9XUD2sLB';

async function monitorFunding() {
  console.log('👀 MONITORING OWNER WALLET FUNDING');
  console.log('='.repeat(40));
  console.log('🎯 WALLET:', OWNER_WALLET);
  console.log('💰 TARGET: 1 SOL minimum');
  console.log('');

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Initial check
  const initialBalance = await connection.getBalance(new PublicKey(OWNER_WALLET));
  console.log('📊 INITIAL BALANCE:', (initialBalance / 1e9).toFixed(4), 'SOL');

  if (initialBalance >= 1e9) { // 1 SOL
    console.log('✅ WALLET ALREADY FUNDED!');
    console.log('🎉 Ready to test token transfers');
    console.log('');
    console.log('🚀 RUN TRANSFER TEST:');
    console.log('node simple_transfer_test.js');
    return;
  }

  console.log('⏳ MONITORING FOR FUNDING...');
  console.log('💡 Follow the funding steps in another terminal:');
  console.log('   node quick_fund_guide.js');
  console.log('');
  console.log('   OR manually visit: https://faucet.solana.com/');
  console.log('');

  let checks = 0;
  const maxChecks = 300; // 5 minutes

  while (checks < maxChecks) {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Check every second

    try {
      const currentBalance = await connection.getBalance(new PublicKey(OWNER_WALLET));
      const solBalance = currentBalance / 1e9;

      if (currentBalance > initialBalance) {
        const increase = currentBalance - initialBalance;

        console.log('\n🎉 FUNDING DETECTED!');
        console.log('='.repeat(40));
        console.log('💰 BALANCE INCREASE:', (increase / 1e9).toFixed(4), 'SOL');
        console.log('💰 NEW TOTAL BALANCE:', solBalance.toFixed(4), 'SOL');
        console.log('');

        if (solBalance >= 0.01) { // Enough for transaction fees
          console.log('✅ SUFFICIENT SOL FOR TRANSFERS!');
          console.log('');
          console.log('🚀 READY TO TEST TOKEN TRANSFER:');
          console.log('node simple_transfer_test.js');
          console.log('');
          console.log('🎯 This will transfer 1 game token from pool to user wallet!');
          return;
        } else {
          console.log('⚠️ LOW BALANCE - May not be enough for fees');
          console.log('💡 Request more SOL from faucet');
        }
      }

      checks++;

      // Progress indicators
      if (checks % 30 === 0) { // Every 30 seconds
        const minutes = Math.floor(checks / 60);
        const seconds = (checks % 60).toString().padStart(2, '0');
        console.log(`⏳ Still monitoring... (${minutes}:${seconds}) - Balance: ${solBalance.toFixed(4)} SOL`);
      }

      if (checks % 60 === 0) { // Every minute
        console.log('💡 TIP: Make sure you requested SOL from the faucet!');
        console.log('   Link: https://faucet.solana.com/');
        console.log('   Address:', OWNER_WALLET);
      }

    } catch (error) {
      console.error('❌ Balance check error:', error.message);
      checks++;
    }
  }

  console.log('\n⏰ MONITORING TIMEOUT (5 minutes)');
  console.log('💡 If funding still pending, try again or check faucet status');
  console.log('');
  console.log('🔄 CHECK BALANCE MANUALLY:');
  console.log('node check_owner_balance.js');
  console.log('');
  console.log('🌐 VISIT FAUCET AGAIN:');
  console.log('https://faucet.solana.com/');
  console.log('Address:', OWNER_WALLET);
}

// Run the monitor
monitorFunding().catch(console.error);




