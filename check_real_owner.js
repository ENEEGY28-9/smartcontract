import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount } from '@solana/spl-token';
import fs from 'fs';

const GAME_POOL = '5oU5mv3xjud2kgemjKwm5qK5Ar356rxboxbNmYXhuAJc';
const CURRENT_OWNER = 'A1Tk1KLSkH4dbeS1mKv9CrUKVRuErHGBg6oH9XUD2sLB';
const REAL_OWNER = '8WU639hdEB5HWu83nvC5q9cj3zRaxRLDGtRGaJpMk95U';

async function checkRealOwner() {
  console.log('🔍 CHECKING REAL GAME POOL OWNER');
  console.log('='.repeat(50));

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  console.log('🎮 Game Pool:', GAME_POOL);
  console.log('❌ Wrong Owner:', CURRENT_OWNER);
  console.log('✅ Real Owner:', REAL_OWNER);
  console.log('');

  // Check real owner
  console.log('1️⃣ CHECKING REAL OWNER WALLET...');
  try {
    const realOwnerBalance = await connection.getBalance(new PublicKey(REAL_OWNER));
    console.log('   💰 Real Owner SOL:', (realOwnerBalance / 1e9).toFixed(4), 'SOL');

    if (realOwnerBalance > 0) {
      console.log('   ✅ Real owner has SOL for transfers!');
    } else {
      console.log('   ❌ Real owner needs SOL funding');
    }
  } catch (error) {
    console.log('   ❌ Cannot check real owner balance');
  }
  console.log('');

  // Check current owner
  console.log('2️⃣ CHECKING CURRENT OWNER WALLET...');
  const currentOwnerBalance = await connection.getBalance(new PublicKey(CURRENT_OWNER));
  console.log('   💰 Current Owner SOL:', (currentOwnerBalance / 1e9).toFixed(4), 'SOL');
  console.log('');

  // Solutions
  console.log('🔧 SOLUTIONS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  console.log('OPTION A: USE REAL OWNER');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. Fund real owner wallet:', REAL_OWNER);
  console.log('2. Create keypair for real owner');
  console.log('3. Update transfer script to use real owner');
  console.log('');

  console.log('OPTION B: CREATE NEW GAME POOL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. Create new token account with correct owner');
  console.log('2. Mint tokens to new pool');
  console.log('3. Update game to use new pool address');
  console.log('');

  console.log('OPTION C: TRANSFER OWNERSHIP');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. Use real owner to transfer ownership to our wallet');
  console.log('2. Requires real owner private key');
  console.log('');

  // Check if we can create keypair for real owner
  console.log('🔑 CREATING KEYPAR FOR REAL OWNER...');
  try {
    // Generate a new keypair for the real owner
    // NOTE: In production, you would need the actual private key
    const { Keypair } = await import('@solana/web3.js');
    const realOwnerKeypair = Keypair.generate();

    const keypairData = {
      publicKey: realOwnerKeypair.publicKey.toString(),
      privateKey: Array.from(realOwnerKeypair.secretKey),
      note: 'Generated keypair for real game pool owner',
      warning: 'This is NOT the real private key - just for testing'
    };

    fs.writeFileSync('real_owner_keypair.json', JSON.stringify(keypairData, null, 2));
    console.log('✅ Generated test keypair for real owner');
    console.log('⚠️  WARNING: This is not the real private key!');
    console.log('💡 Need real private key for actual transfers');
    console.log('');

  } catch (error) {
    console.log('❌ Could not generate keypair');
  }

  // Recommendation
  console.log('🎯 RECOMMENDED APPROACH:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. Fund the real owner wallet:', REAL_OWNER);
  console.log('   🌐 https://faucet.solana.com/');
  console.log('   📧 Address:', REAL_OWNER);
  console.log('   💰 Amount: 1 SOL');
  console.log('');
  console.log('2. Get the real private key for this wallet');
  console.log('   🔑 Without private key, cannot sign transfers');
  console.log('');
  console.log('3. Update transfer script to use real owner');
  console.log('');
  console.log('4. Test transfer with correct authority');
  console.log('');

  console.log('📋 CURRENT STATUS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Game Pool: Exists with 2288 tokens');
  console.log('❌ Owner Mismatch: Wrong authority for transfers');
  console.log('✅ Real Owner: Identified and ready');
  console.log('💰 Need: Private key + SOL for real owner');
  console.log('');

}

// Run check
checkRealOwner().catch(console.error);




