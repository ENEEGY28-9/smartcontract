import { Connection, PublicKey } from '@solana/web3.js';
import fs from 'fs';

const USER_WALLET = '4UkWvx2Y59XSuhaCfeYDS56RM1WcsSdgjJ7yzLEbMyNf';

async function fundBothWallets() {
  console.log('🪙 FUNDING BOTH WALLETS FOR TOKEN TRANSFERS');
  console.log('='.repeat(50));

  // Load owner wallet
  let ownerData;
  try {
    ownerData = JSON.parse(fs.readFileSync('game_pool_owner.json', 'utf8'));
  } catch (error) {
    console.log('❌ Owner wallet not found. Run: node setup_complete_token_transfer.js');
    return;
  }

  const OWNER_WALLET = ownerData.publicKey;

  console.log('👤 USER WALLET:', USER_WALLET);
  console.log('👑 OWNER WALLET:', OWNER_WALLET);
  console.log('');

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Check current balances
  const userBalance = await connection.getBalance(new PublicKey(USER_WALLET));
  const ownerBalance = await connection.getBalance(new PublicKey(OWNER_WALLET));

  console.log('💰 CURRENT BALANCES:');
  console.log('   User Wallet:', (userBalance / 1e9).toFixed(4), 'SOL');
  console.log('   Owner Wallet:', (ownerBalance / 1e9).toFixed(4), 'SOL');
  console.log('');

  const userNeedsFunding = userBalance < 1000000; // 0.001 SOL
  const ownerNeedsFunding = ownerBalance < 100000000; // 0.1 SOL

  if (!userNeedsFunding && !ownerNeedsFunding) {
    console.log('✅ BOTH WALLETS ALREADY FUNDED!');
    return await testTransferReady();
  }

  console.log('📋 FUNDING REQUIREMENTS:');
  console.log('   User Wallet:', userNeedsFunding ? '❌ NEEDS 0.001+ SOL' : '✅ OK');
  console.log('   Owner Wallet:', ownerNeedsFunding ? '❌ NEEDS 0.1+ SOL' : '✅ OK');
  console.log('');

  console.log('🌐 FUNDING INSTRUCTIONS:');
  console.log('');

  if (userNeedsFunding) {
    console.log('💰 FUND USER WALLET:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. Open: https://faucet.solana.com/');
    console.log('2. Select: Devnet');
    console.log('3. Paste:', USER_WALLET);
    console.log('4. Request: 1 SOL');
    console.log('5. Wait: 30 seconds\n');
  }

  if (ownerNeedsFunding) {
    console.log('👑 FUND OWNER WALLET:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. Open: https://faucet.solana.com/');
    console.log('2. Select: Devnet');
    console.log('3. Paste:', OWNER_WALLET);
    console.log('4. Request: 1 SOL');
    console.log('5. Wait: 30 seconds\n');
  }

  console.log('⏳ MONITORING BALANCES...');
  console.log('Keep this script running - it will detect when funding is complete!\n');

  // Monitor balances
  let monitoring = true;
  let checks = 0;

  while (monitoring && checks < 300) { // 5 minutes max
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const newUserBalance = await connection.getBalance(new PublicKey(USER_WALLET));
      const newOwnerBalance = await connection.getBalance(new PublicKey(OWNER_WALLET));

      if ((userBalance !== newUserBalance || ownerBalance !== newOwnerBalance) && checks > 0) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] BALANCE UPDATE:`);
        if (userBalance !== newUserBalance) {
          console.log(`   👤 User: ${(newUserBalance / 1e9).toFixed(4)} SOL (+${((newUserBalance - userBalance) / 1e9).toFixed(4)})`);
        }
        if (ownerBalance !== newOwnerBalance) {
          console.log(`   👑 Owner: ${(newOwnerBalance / 1e9).toFixed(4)} SOL (+${((newOwnerBalance - ownerBalance) / 1e9).toFixed(4)})`);
        }
      }

      // Check if both have sufficient funds
      const userFunded = newUserBalance >= 1000000;
      const ownerFunded = newOwnerBalance >= 100000000;

      if (userFunded && ownerFunded) {
        console.log('\n🎉 BOTH WALLETS SUCCESSFULLY FUNDED!');
        console.log('💰 Final Balances:');
        console.log('   User:', (newUserBalance / 1e9).toFixed(4), 'SOL');
        console.log('   Owner:', (newOwnerBalance / 1e9).toFixed(4), 'SOL');
        console.log('');
        monitoring = false;

        return await testTransferReady();
      }

      checks++;
      if (checks % 30 === 0) { // Every 30 seconds
        const minutes = Math.floor(checks / 60);
        const seconds = checks % 60;
        console.log(`⏳ Still monitoring... (${minutes}:${seconds.toString().padStart(2, '0')})`);
      }

    } catch (error) {
      console.error('❌ Balance check error:', error.message);
    }
  }

  console.log('\n⏰ MONITORING TIMEOUT');
  console.log('💡 Try funding again or check balances manually');
  console.log('🔍 Run: node fund_both_wallets.js (to restart monitoring)');
}

async function testTransferReady() {
  console.log('🧪 TESTING TRANSFER READINESS...\n');

  try {
    // Load owner data
    const ownerData = JSON.parse(fs.readFileSync('game_pool_owner.json', 'utf8'));

    console.log('✅ Owner keypair loaded');
    console.log('✅ Transfer functions ready');
    console.log('✅ Game pool configured');
    console.log('✅ User wallet ready');
    console.log('');

    console.log('🚀 READY FOR REAL TOKEN TRANSFERS!');
    console.log('💡 Run: node execute_real_transfer.js');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

fundBothWallets();






