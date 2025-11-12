import { Connection, PublicKey } from '@solana/web3.js';

const USER_WALLET = '4UkWvx2Y59XSuhaCfeYDS56RM1WcsSdgjJ7yzLEbMyNf';
const TARGET_SOL = 1.0; // Minimum SOL needed

async function monitorFunding() {
  console.log('⏳ WAITING FOR WALLET FUNDING...\n');

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const userPubkey = new PublicKey(USER_WALLET);

  console.log('🎯 Target Wallet:', USER_WALLET);
  console.log('💰 Target Balance: ' + TARGET_SOL + ' SOL minimum');
  console.log('🔄 Checking every 10 seconds...\n');

  let lastBalance = 0;
  let checks = 0;
  const maxChecks = 300; // 50 minutes max

  console.log('📊 BALANCE HISTORY:');
  console.log('─'.repeat(50));

  while (checks < maxChecks) {
    try {
      const balance = await connection.getBalance(userPubkey);
      const solBalance = balance / 1e9;

      const timestamp = new Date().toLocaleTimeString();
      const status = solBalance >= TARGET_SOL ? '✅ READY' : '⏳ WAITING';

      if (balance !== lastBalance || checks === 0) {
        console.log(`${timestamp} | ${solBalance.toFixed(4)} SOL | ${status}`);
        lastBalance = balance;
      }

      if (solBalance >= TARGET_SOL) {
        console.log('\n🎉 WALLET SUCCESSFULLY FUNDED!');
        console.log('💰 Final Balance: ' + solBalance.toFixed(4) + ' SOL');
        console.log('\n🚀 NEXT STEPS:');
        console.log('1. ✅ node check_wallet_ready.js');
        console.log('2. 🚀 node full_interaction_test.js');
        console.log('3. 🎮 Your E-to-SOL claims are ready!\n');
        return true;
      }

      checks++;

      // Progress indicator every 6 checks (1 minute)
      if (checks % 6 === 0) {
        const minutes = Math.floor(checks / 6);
        console.log(`⏰ Still monitoring... (${minutes} minutes elapsed)`);
      }

    } catch (error) {
      console.error('❌ Balance check error:', error.message);
    }

    // Wait 10 seconds
    await new Promise(resolve => setTimeout(resolve, 10000));
  }

  console.log('\n⏰ MONITORING TIMEOUT (50 minutes)');
  console.log('💡 Try funding again or check balance manually');
  console.log('🔍 Run: node check_wallet_ready.js');
  return false;
}

async function showFundingInstructions() {
  console.log('🪙 HOW TO FUND YOUR WALLET:');
  console.log('='.repeat(50));

  console.log('\n🚀 RECOMMENDED - QuickNode Faucet:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. 🔗 Open: https://faucet.quicknode.com/solana/devnet');
  console.log('2. 📝 Paste: ' + USER_WALLET);
  console.log('3. 🎯 Click: "Send Devnet SOL"');
  console.log('4. ⏳ Wait: 10-30 seconds');
  console.log('5. ✅ Done! This script will detect automatically\n');

  console.log('🌐 ALTERNATIVE - Official Faucet:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. 🔗 Open: https://faucet.solana.com/');
  console.log('2. 🌍 Select: Devnet');
  console.log('3. 📝 Paste: ' + USER_WALLET);
  console.log('4. 🎯 Request: 1-2 SOL');
  console.log('5. ⏳ Wait: 30-60 seconds\n');

  console.log('💡 TIP: Keep this script running while you fund the wallet!');
  console.log('🎉 It will automatically detect when SOL arrives.\n');
}

async function main() {
  await showFundingInstructions();
  console.log('🔄 STARTING BALANCE MONITORING...\n');

  const funded = await monitorFunding();

  if (!funded) {
    console.log('\n📋 MANUAL CHECK:');
    console.log('node check_wallet_ready.js\n');
  }
}

main().catch(console.error);






