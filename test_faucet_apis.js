import fetch from 'node-fetch';

const USER_WALLET = '4UkWvx2Y59XSuhaCfeYDS56RM1WcsSdgjJ7yzLEbMyNf';

async function testQuickNodeAPI() {
  console.log('🧪 Testing QuickNode Faucet API...\n');

  const endpoints = [
    'https://faucet.quicknode.com/solana/devnet',
    'https://faucet.quicknode.com/drip',
    'https://faucet.quicknode.com/ethereum/sepolia'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`📡 Testing: ${endpoint}`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify({
          address: USER_WALLET,
          amount: 1000000000 // 1 SOL in lamports
        })
      });

      console.log(`📊 Status: ${response.status}`);
      console.log(`📝 Headers:`, Object.fromEntries(response.headers.entries()));

      const text = await response.text();
      console.log(`📄 Response:`, text.substring(0, 200) + (text.length > 200 ? '...' : ''));

    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }

    console.log('─'.repeat(50));
  }
}

async function testOfficialFaucet() {
  console.log('🧪 Testing Official Solana Faucet API...\n');

  // Try different potential endpoints
  const endpoints = [
    'https://faucet.solana.com/api/request',
    'https://faucet.solana.com/api/airdrop',
    'https://api.mainnet-beta.solana.com/faucet/v1/requestAirdrop',
    'https://api.devnet.solana.com/faucet/v1/requestAirdrop'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`📡 Testing: ${endpoint}`);

      const payload = {
        recipient: USER_WALLET,
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

      console.log(`📊 Status: ${response.status}`);
      console.log(`📝 Content-Type: ${response.headers.get('content-type')}`);

      try {
        const json = await response.json();
        console.log(`📄 JSON Response:`, json);
      } catch (error) {
        const text = await response.text();
        console.log(`📄 Text Response:`, text.substring(0, 200));
      }

    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }

    console.log('─'.repeat(50));
  }
}

async function showManualInstructions() {
  console.log('📋 MANUAL FUNDING REQUIRED\n');

  console.log('🚀 FASTEST METHOD - QuickNode Faucet:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. Click: https://faucet.quicknode.com/solana/devnet');
  console.log('2. Paste: ' + USER_WALLET);
  console.log('3. Click: Send Devnet SOL');
  console.log('4. Done! Usually works instantly\n');

  console.log('🔗 DIRECT LINK (click to open):');
  console.log('https://faucet.quicknode.com/solana/devnet\n');

  console.log('⏳ After funding, run:');
  console.log('node check_wallet_ready.js\n');
}

async function main() {
  console.log('🔬 FAUCET API TESTING & FUNDING GUIDE\n');

  console.log('🎯 Target Wallet:', USER_WALLET);
  console.log('='.repeat(50) + '\n');

  // Test APIs first
  await testQuickNodeAPI();
  await testOfficialFaucet();

  // Show manual instructions
  await showManualInstructions();

  console.log('💡 TIP: While testing APIs, you can manually fund using the links above');
  console.log('🚀 After funding: node check_wallet_ready.js');
}

main().catch(console.error);






