import { Connection, PublicKey } from '@solana/web3.js';

const USER_WALLET = '4UkWvx2Y59XSuhaCfeYDS56RM1WcsSdgjJ7yzLEbMyNf';

async function monitorBalance() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const userPubkey = new PublicKey(USER_WALLET);

  console.log('👀 MONITORING WALLET BALANCE...');
  console.log('Address: ' + USER_WALLET);
  console.log('Press Ctrl+C to stop\n');

  let lastBalance = 0;

  while (true) {
    try {
      const currentBalance = await connection.getBalance(userPubkey);
      const solBalance = currentBalance / 1e9;

      if (currentBalance !== lastBalance) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] 💰 Balance changed: ${lastBalance / 1e9} → ${solBalance} SOL`);

        if (lastBalance === 0 && currentBalance > 0) {
          console.log('\n🎉 WALLET FUNDED! Ready for testing.');
          console.log('💡 Run: node check_wallet_ready.js');
          console.log('🚀 Then: node test_game_pool_transfer.js\n');
        }

        lastBalance = currentBalance;
      }

      // Check every 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));

    } catch (error) {
      console.error('❌ Error checking balance:', error.message);
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait longer on error
    }
  }
}

monitorBalance().catch(console.error);






