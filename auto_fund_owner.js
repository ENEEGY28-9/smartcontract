import fetch from 'node-fetch';
import { Connection, PublicKey, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import fs from 'fs';

const OWNER_WALLET = 'A1Tk1KLSkH4dbeS1mKv9CrUKVRuErHGBg6oH9XUD2sLB';

async function autoFundOwner() {
  console.log('🤖 AUTO FUNDING OWNER WALLET WITH SOL');
  console.log('='.repeat(50));

  console.log('🎯 Target Wallet:', OWNER_WALLET);
  console.log('💰 Target Amount: 1 SOL minimum');
  console.log('');

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Check current balance
  const currentBalance = await checkBalance(connection);
  console.log('💰 Current Balance:', currentBalance.toFixed(4), 'SOL');

  if (currentBalance >= 1) {
    console.log('✅ Wallet already funded!');
    return true;
  }

  console.log('\n🔄 ATTEMPTING AUTO FUNDING...\n');

  // Method 1: QuickNode Faucet API
  console.log('📡 Method 1: QuickNode Faucet');
  const quickNodeSuccess = await tryQuickNodeFaucet();
  if (quickNodeSuccess) {
    console.log('✅ QuickNode funding successful!');
    return true;
  }

  // Method 2: Official Solana Devnet Faucet
  console.log('\n📡 Method 2: Official Solana Faucet');
  const officialSuccess = await tryOfficialFaucet();
  if (officialSuccess) {
    console.log('✅ Official faucet funding successful!');
    return true;
  }

  // Method 3: Alternative Faucet Services
  console.log('\n📡 Method 3: Alternative Services');
  const alternativeSuccess = await tryAlternativeFaucets();
  if (alternativeSuccess) {
    console.log('✅ Alternative faucet funding successful!');
    return true;
  }

  console.log('\n❌ All automated methods failed');
  console.log('📋 MANUAL FUNDING REQUIRED:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🌐 Open: https://faucet.solana.com/');
  console.log('🌍 Select: Devnet');
  console.log('📝 Paste:', OWNER_WALLET);
  console.log('🎯 Click: Request Airdrop (1 SOL)');
  console.log('⏳ Wait: 30-60 seconds');
  console.log('');
  console.log('🔄 After funding, run: node simple_transfer_test.js');

  return false;
}

async function checkBalance(connection) {
  const balance = await connection.getBalance(new PublicKey(OWNER_WALLET));
  return balance / 1e9;
}

async function tryQuickNodeFaucet() {
  const faucets = [
    'https://faucet.quicknode.com/solana/devnet',
    'https://faucet.quicknode.com/drip',
    'https://faucet.quicknode.com/solana'
  ];

  for (const faucetUrl of faucets) {
    try {
      console.log('   Trying:', faucetUrl);

      const response = await fetch(faucetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify({
          address: OWNER_WALLET,
          amount: 1000000000 // 1 SOL
        })
      });

      console.log('   Status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('   Response:', result);
        return true;
      } else {
        const text = await response.text();
        console.log('   Response:', text.substring(0, 100));
      }

    } catch (error) {
      console.log('   Error:', error.message);
    }
  }

  return false;
}

async function tryOfficialFaucet() {
  const endpoints = [
    'https://faucet.solana.com/api/request',
    'https://api.devnet.solana.com/faucet/v1/requestAirdrop',
    'https://devnet.solana.com/faucet/v1/requestAirdrop'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log('   Trying:', endpoint);

      const payload = {
        recipient: OWNER_WALLET,
        amount: 1000000000,
        network: 'devnet'
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      console.log('   Status:', response.status);

      try {
        const result = await response.json();
        console.log('   Response:', result);

        if (result.success || result.result) {
          return true;
        }
      } catch (error) {
        const text = await response.text();
        console.log('   Text Response:', text.substring(0, 100));
      }

    } catch (error) {
      console.log('   Error:', error.message);
    }
  }

  return false;
}

async function tryAlternativeFaucets() {
  const faucets = [
    {
      name: 'Solana Labs Devnet',
      url: 'https://faucet.solana.com/',
      method: 'manual'
    },
    {
      name: 'QuickNode Devnet',
      url: 'https://faucet.quicknode.com/solana/devnet',
      method: 'manual'
    }
  ];

  console.log('   Alternative faucets require manual interaction:');
  faucets.forEach(faucet => {
    console.log('   -', faucet.name + ':', faucet.url);
  });

  // Try one more programmatic approach
  try {
    console.log('\n   Trying programmatic QuickNode...');

    const response = await fetch('https://faucet.quicknode.com/solana/devnet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      body: JSON.stringify({
        address: OWNER_WALLET
      })
    });

    console.log('   Status:', response.status);

    if (response.ok) {
      const result = await response.json();
      console.log('   Result:', result);
      return true;
    }

  } catch (error) {
    console.log('   Error:', error.message);
  }

  return false;
}

async function simulateFunding() {
  console.log('\n🎭 FALLBACK: SIMULATING SOL FUNDING');
  console.log('⚠️  This is for testing purposes only!');
  console.log('💡 In production, use real faucet services');
  console.log('');

  // Create a mock transaction to simulate funding
  // This doesn't actually add SOL but allows us to test the transfer logic

  const mockData = {
    simulatedSOL: 2.0,
    note: 'This is simulated SOL for testing token transfer logic',
    timestamp: new Date().toISOString(),
    wallet: OWNER_WALLET
  };

  fs.writeFileSync('simulated_funding.json', JSON.stringify(mockData, null, 2));

  console.log('✅ Created simulation data');
  console.log('💰 Simulated Balance: 2.0 SOL');
  console.log('🎯 Now you can test transfer logic:');
  console.log('   node simple_transfer_test.js');
  console.log('');
  console.log('⚠️  REMEMBER: This is simulation only!');
  console.log('💡 For real SOL: Use manual faucet methods above');

  return true;
}

// Main execution
autoFundOwner().then(success => {
  if (!success) {
    console.log('\n🔄 FALLING BACK TO SIMULATION...');
    return simulateFunding();
  }
}).catch(console.error);




