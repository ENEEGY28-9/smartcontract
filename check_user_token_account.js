import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import fs from 'fs';

const USER_WALLET = '4UkWvx2Y59XSuhaCfeYDS56RM1WcsSdgjJ7yzLEbMyNf';
const GAME_POOL_DATA_FILE = 'new_game_pool.json';

async function checkUserTokenAccount() {
  console.log('🔍 CHECKING USER TOKEN ACCOUNT COMPATIBILITY');
  console.log('='.repeat(50));

  // Load game pool data
  let gamePoolData;
  try {
    gamePoolData = JSON.parse(fs.readFileSync(GAME_POOL_DATA_FILE, 'utf8'));
  } catch (error) {
    console.error('❌ Cannot load game pool data');
    return;
  }

  const tokenMint = gamePoolData.tokenMint;
  const userPubkey = new PublicKey(USER_WALLET);
  const tokenMintPubkey = new PublicKey(tokenMint);

  console.log('👤 User Wallet:', USER_WALLET);
  console.log('🪙 Token Mint:', tokenMint);
  console.log('');

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Get associated token address
  const associatedTokenAddress = await getAssociatedTokenAddress(tokenMintPubkey, userPubkey);
  console.log('🎫 Associated Token Address:', associatedTokenAddress.toString());
  console.log('');

  // Check if account exists
  console.log('1️⃣ CHECKING TOKEN ACCOUNT EXISTENCE...');

  try {
    const accountInfo = await connection.getAccountInfo(associatedTokenAddress);
    if (accountInfo) {
      console.log('✅ Token account exists');
      console.log('   📏 Data length:', accountInfo.data.length, 'bytes');
      console.log('   👤 Owner program:', accountInfo.owner.toString());
    } else {
      console.log('❌ Token account does not exist');
      console.log('   📝 Need to create account during transfer');
      return;
    }
  } catch (error) {
    console.log('❌ Error checking account:', error.message);
    return;
  }

  // Check token account data
  console.log('');
  console.log('2️⃣ CHECKING TOKEN ACCOUNT DATA...');

  try {
    const tokenAccount = await getAccount(connection, associatedTokenAddress);
    console.log('✅ Valid SPL token account');
    console.log('   🪙 Account Mint:', tokenAccount.mint.toString());
    console.log('   👤 Account Owner:', tokenAccount.owner.toString());
    console.log('   💰 Token Balance:', tokenAccount.amount.toString());
    console.log('   🔢 Formatted Balance:', Number(tokenAccount.amount) / Math.pow(10, 9));
    console.log('');

    // Verify compatibility
    console.log('3️⃣ VERIFYING COMPATIBILITY...');

    if (tokenAccount.mint.toString() !== tokenMint) {
      console.log('❌ MINT MISMATCH!');
      console.log('   Token account mint:', tokenAccount.mint.toString());
      console.log('   Game pool mint:', tokenMint);
      console.log('   📝 This token account is for a different token');
      console.log('');
      console.log('🔧 SOLUTION: Create new token account for this mint');
    } else {
      console.log('✅ Mint matches - account is compatible');
    }

    if (tokenAccount.owner.toString() !== USER_WALLET) {
      console.log('❌ OWNER MISMATCH!');
      console.log('   Expected owner:', USER_WALLET);
      console.log('   Actual owner:', tokenAccount.owner.toString());
    } else {
      console.log('✅ Owner matches');
    }

  } catch (error) {
    console.log('❌ Not a valid token account:', error.message);
    console.log('   📝 Need to create token account during transfer');
  }

  console.log('');
  console.log('🎯 TRANSFER PREPARATION:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const tokenAccount = await getAccount(connection, associatedTokenAddress);
    if (tokenAccount.mint.toString() === tokenMint) {
      console.log('✅ User token account ready for transfer');
      console.log('🚀 Can proceed with transfer');
    } else {
      console.log('⚠️  User has token account for different mint');
      console.log('📝 Transfer will create new associated token account');
    }
  } catch (error) {
    console.log('📝 User needs new token account for this mint');
    console.log('🔄 Transfer will include account creation');
  }
}

// Run check
checkUserTokenAccount().catch(console.error);




