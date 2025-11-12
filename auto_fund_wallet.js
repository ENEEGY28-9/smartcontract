import fetch from 'node-fetch';
import { Connection, PublicKey } from '@solana/web3.js';
import fs from 'fs';

const DEVNET_FAUCET_URL = 'https://faucet.solana.com/api/request';
const USER_WALLET = '4UkWvx2Y59XSuhaCfeYDS56RM1WcsSdgjJ7yzLEbMyNf';

async function checkCurrentBalance() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const balance = await connection.getBalance(new PublicKey(USER_WALLET));
  return balance / 1e9; // Convert to SOL
}

async function requestAirdropAutomated() {
  console.log('🚀 AUTOMATED SOL FAUCET REQUEST\n');

  try {
    // Check current balance
    const initialBalance = await checkCurrentBalance();
    console.log(`💰 Initial Balance: ${initialBalance} SOL`);

    if (initialBalance >= 1) {
      console.log('✅ Wallet already has sufficient SOL!');
      return true;
    }

    console.log('📡 Requesting SOL from faucet...');

    // Try multiple airdrop amounts
    const amounts = [2000000000, 1000000000, 500000000]; // 2 SOL, 1 SOL, 0.5 SOL

    for (const amount of amounts) {
      try {
        console.log(`🎯 Requesting ${amount / 1e9} SOL...`);

        const response = await fetch(DEVNET_FAUCET_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipient: USER_WALLET,
            amount: amount,
            network: 'devnet'
          })
        });

        const result = await response.json();

        if (response.ok && result.success) {
          console.log('✅ Airdrop request successful!');
          console.log(`🔗 Transaction: ${result.txHash || 'Processing...'}`);
          break;
        } else {
          console.log(`❌ Request failed: ${result.message || 'Unknown error'}`);
        }

        // Wait between requests
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.log(`❌ Network error: ${error.message}`);
      }
    }

    // Wait for confirmation
    console.log('\n⏳ Waiting for transaction confirmation...');
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Check final balance
    const finalBalance = await checkCurrentBalance();
    console.log(`💰 Final Balance: ${finalBalance} SOL`);

    if (finalBalance > initialBalance) {
      console.log(`🎉 Successfully received ${finalBalance - initialBalance} SOL!`);
      return true;
    } else {
      console.log('❌ Airdrop may have failed or is still processing');
      return false;
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function manualFaucetInstructions() {
  console.log('💰 MANUAL SOL FUNDING INSTRUCTIONS\n');

  console.log('Since automated faucet may not work, please fund manually:\n');

  console.log('🌐 METHOD 1 - Official Solana Faucet:');
  console.log('1. Open: https://faucet.solana.com/');
  console.log('2. Select: Devnet');
  console.log('3. Paste address:');
  console.log(`   ${USER_WALLET}`);
  console.log('4. Click: Request Airdrop');
  console.log('5. Select amount: 1-2 SOL\n');

  console.log('🌐 METHOD 2 - QuickNode Faucet:');
  console.log('1. Open: https://faucet.quicknode.com/solana/devnet');
  console.log('2. Paste address:');
  console.log(`   ${USER_WALLET}`);
  console.log('3. Click: Send Devnet SOL\n');

  console.log('🌐 METHOD 3 - Discord Faucet Bot:');
  console.log('1. Join: https://discord.gg/solana');
  console.log('2. Go to #devnet-faucet channel');
  console.log('3. Type: $airdrop ' + USER_WALLET);
  console.log('4. Bot will send SOL\n');

  console.log('⏳ After funding, run: node check_wallet_ready.js');
}

async function main() {
  console.log('🪙 FUNDING DEVNET WALLET WITH SOL\n');
  console.log('Target Wallet:', USER_WALLET);
  console.log('='.repeat(50) + '\n');

  // Try automated first
  console.log('🤖 ATTEMPTING AUTOMATED FAUCET REQUEST...\n');
  const automatedSuccess = await requestAirdropAutomated();

  if (automatedSuccess) {
    console.log('\n✅ WALLET SUCCESSFULLY FUNDED!');
    console.log('🚀 Next: node check_wallet_ready.js');
  } else {
    console.log('\n⚠️  AUTOMATED FAUCET FAILED');
    console.log('📋 FALLING BACK TO MANUAL INSTRUCTIONS...\n');
    await manualFaucetInstructions();
  }
}

main().catch(console.error);






