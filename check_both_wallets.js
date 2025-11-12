import { Connection, PublicKey } from '@solana/web3.js';

const OLD_OWNER = 'A1Tk1KLSkH4dbeS1mKv9CrUKVRuErHGBg6oH9XUD2sLB';
const REAL_OWNER = '8WU639hdEB5HWu83nvC5q9cj3zRaxRLDGtRGaJpMk95U';
const USER_WALLET = '4UkWvx2Y59XSuhaCfeYDS56RM1WcsSdgjJ7yzLEbMyNf';
const GAME_POOL = '5oU5mv3xjud2kgemjKwm5qK5Ar356rxboxbNmYXhuAJc';

async function checkBothWallets() {
  console.log('🔍 CHECKING ALL WALLETS STATUS');
  console.log('='.repeat(50));

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  console.log('📊 WALLET BALANCES:');
  console.log('');

  // Check old owner
  const oldOwnerBalance = await connection.getBalance(new PublicKey(OLD_OWNER));
  console.log('👑 Old Owner:', OLD_OWNER);
  console.log('   💰 SOL:', (oldOwnerBalance / 1e9).toFixed(4), 'SOL');
  console.log('   📝 Note: Wrong authority for game pool');
  console.log('');

  // Check real owner
  const realOwnerBalance = await connection.getBalance(new PublicKey(REAL_OWNER));
  console.log('🎯 Real Owner:', REAL_OWNER);
  console.log('   💰 SOL:', (realOwnerBalance / 1e9).toFixed(4), 'SOL');
  console.log('   📝 Note: Correct authority for game pool');
  console.log('');

  // Check user wallet
  const userBalance = await connection.getBalance(new PublicKey(USER_WALLET));
  console.log('👤 User Wallet:', USER_WALLET);
  console.log('   💰 SOL:', (userBalance / 1e9).toFixed(4), 'SOL');
  console.log('');

  // Status summary
  console.log('📋 FUNDING STATUS SUMMARY:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const oldOwnerHasSol = oldOwnerBalance >= 10000; // 0.00001 SOL
  const realOwnerHasSol = realOwnerBalance >= 10000;

  if (realOwnerHasSol) {
    console.log('✅ REAL OWNER FUNDED - Ready for transfers!');
    console.log('🎉 Run: node real_owner_transfer.js');
  } else if (oldOwnerHasSol) {
    console.log('⚠️  OLD OWNER HAS SOL but wrong authority');
    console.log('💡 Need to fund REAL OWNER instead');
  } else {
    console.log('❌ NO WALLETS FUNDED');
    console.log('💡 Need to fund REAL OWNER for token transfers');
  }

  console.log('');
  console.log('🎯 CORRECT FUNDING TARGET:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🌐 Faucet: https://solfaucet.com/');
  console.log('📧 Address:', REAL_OWNER);
  console.log('💰 Amount: 1 SOL minimum');
  console.log('');

  console.log('📝 STEPS:');
  console.log('1. Select "Devnet"');
  console.log('2. Paste address:', REAL_OWNER);
  console.log('3. Click "Have a drink!"');
  console.log('4. Wait 30 seconds');
  console.log('5. Run: node check_both_wallets.js');
  console.log('');

  if (!realOwnerHasSol) {
    console.log('🔄 WAITING FOR FUNDING...');
    console.log('Run this script again after funding');
  }
}

checkBothWallets().catch(console.error);




