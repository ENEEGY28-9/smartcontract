import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const userWallet = '4UkWvx2Y59XSuhaCfeYDS56RM1WcsSdgjJ7yzLEbMyNf';

console.log('💰 FUND USER WALLET WITH SOL');
console.log('==============================\n');
console.log('📋 Instructions:');
console.log('1. Go to: https://faucet.solana.com/');
console.log('2. Select: Devnet');
console.log('3. Paste this address:');
console.log('   ' + userWallet);
console.log('4. Click: Request Airdrop (2 SOL max)');
console.log('5. Wait 30 seconds for confirmation\n');

console.log('🔍 Checking current balance...');

try {
  const balance = await connection.getBalance(new PublicKey(userWallet));
  console.log('Current SOL Balance: ' + (balance / 1e9) + ' SOL');

  if (balance === 0) {
    console.log('❌ Wallet needs SOL to pay transaction fees');
    console.log('💡 Get SOL from faucet first!');
  } else {
    console.log('✅ Wallet has SOL for transactions');
  }
} catch (error) {
  console.error('❌ Error checking balance:', error.message);
}

console.log('\n📱 Alternative Faucets:');
console.log('- https://faucet.solana.com/ (Official)');
console.log('- https://faucet.quicknode.com/solana/devnet (QuickNode)');
console.log('\n⚠️  Note: Devnet SOL has no real value, only for testing');






