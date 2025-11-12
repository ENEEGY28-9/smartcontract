import { execSync } from 'child_process';
import { Connection, PublicKey } from '@solana/web3.js';

const OWNER_WALLET = 'A1Tk1KLSkH4dbeS1mKv9CrUKVRuErHGBg6oH9XUD2sLB';

console.log('🚀 QUICK FUND OWNER WALLET GUIDE');
console.log('='.repeat(40));
console.log('');

console.log('🎯 WALLET TO FUND:', OWNER_WALLET);
console.log('');

console.log('⚡ FASTEST METHOD:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('1. 🌐 OPEN THIS LINK IN BROWSER:');
console.log('   https://faucet.solana.com/');
console.log('');
console.log('2. 🌍 SELECT: Devnet (dropdown menu)');
console.log('');
console.log('3. 📝 PASTE ADDRESS:');
console.log('   ' + OWNER_WALLET);
console.log('');
console.log('4. 🎯 REQUEST: 2 SOL (maximum)');
console.log('');
console.log('5. ⏳ WAIT: 30 seconds for confirmation');
console.log('');

console.log('🔍 VERIFY FUNDING:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Run this command after funding:');
console.log('node check_owner_balance.js');
console.log('');

console.log('✅ EXPECTED RESULT:');
console.log('   💰 SOL Balance: > 0.0000 SOL');
console.log('');

console.log('🎮 NEXT STEP AFTER FUNDING:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('node simple_transfer_test.js');
console.log('');
console.log('🎯 This will transfer 1 token from Game Pool to User Wallet!');
console.log('');

console.log('📋 CURRENT STATUS CHECK:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Check current balance
async function checkStatus() {
  try {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const balance = await connection.getBalance(new PublicKey(OWNER_WALLET));
    const solBalance = (balance / 1e9).toFixed(4);

    console.log('💰 Owner Wallet SOL:', solBalance, 'SOL');

    if (balance > 0) {
      console.log('✅ READY FOR TOKEN TRANSFERS!');
      console.log('');
      console.log('🎉 RUN TRANSFER TEST NOW:');
      console.log('node simple_transfer_test.js');
    } else {
      console.log('❌ NEEDS FUNDING - Follow steps above');
      console.log('');
      console.log('💡 TIP: Keep this script open while funding');
      console.log('🔄 Run again after funding to check status');
    }

  } catch (error) {
    console.error('❌ Error checking balance:', error.message);
  }
}

checkStatus();




