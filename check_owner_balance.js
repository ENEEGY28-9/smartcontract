import { Connection, PublicKey } from '@solana/web3.js';
import fs from 'fs';

async function checkOwnerBalance() {
  console.log('👑 CHECKING OWNER WALLET BALANCE\n');

  try {
    const ownerData = JSON.parse(fs.readFileSync('game_pool_owner.json', 'utf8'));
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    const balance = await connection.getBalance(new PublicKey(ownerData.publicKey));
    const solBalance = (balance / 1e9).toFixed(4);

    console.log('📧 Owner Address:', ownerData.publicKey);
    console.log('💰 SOL Balance:', solBalance, 'SOL');

    if (balance >= 5000) {
      console.log('✅ SUFFICIENT: Ready for token transfer');
      console.log('🚀 Run: node test_real_token_transfer.js');
    } else {
      console.log('❌ INSUFFICIENT: Need at least 0.000005 SOL');
      console.log('💡 Fund owner wallet at: https://faucet.solana.com/');
      console.log('   Paste address:', ownerData.publicKey);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('💡 Make sure game_pool_owner.json exists');
  }
}

checkOwnerBalance();




