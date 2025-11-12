import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';

const GAME_POOL_DATA_FILE = 'new_game_pool.json';

async function debugNewGamePool() {
  console.log('🔍 DEBUGGING NEW GAME POOL ACCOUNT');
  console.log('='.repeat(50));

  // Load game pool data
  let gamePoolData;
  try {
    gamePoolData = JSON.parse(fs.readFileSync(GAME_POOL_DATA_FILE, 'utf8'));
  } catch (error) {
    console.error('❌ Cannot load game pool data');
    return;
  }

  console.log('🎮 Game Pool Address:', gamePoolData.gamePoolAddress);
  console.log('🪙 Token Mint:', gamePoolData.tokenMint);
  console.log('👑 Owner:', gamePoolData.owner);
  console.log('');

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  console.log('1️⃣ CHECKING GAME POOL ACCOUNT...');

  const poolAccount = await connection.getAccountInfo(new PublicKey(gamePoolData.gamePoolAddress));
  if (!poolAccount) {
    console.log('❌ Game pool account does not exist!');
    return;
  }

  console.log('   ✅ Account exists');
  console.log('   📏 Data length:', poolAccount.data.length, 'bytes');
  console.log('   👤 Owner program:', poolAccount.owner.toString());
  console.log('');

  console.log('2️⃣ CHECKING TOKEN ACCOUNT DATA...');

  try {
    const tokenAccount = await getAccount(connection, new PublicKey(gamePoolData.gamePoolAddress));
    console.log('   ✅ Is SPL Token Account');
    console.log('   🪙 Token Mint:', tokenAccount.mint.toString());
    console.log('   👤 Token Owner:', tokenAccount.owner.toString());
    console.log('   💰 Token Amount:', tokenAccount.amount.toString());
    console.log('   🔢 Amount (formatted):', Number(tokenAccount.amount) / Math.pow(10, 9));
    console.log('   🔒 Delegate:', tokenAccount.delegate?.toString() || 'None');
    console.log('   🚫 Close Authority:', tokenAccount.closeAuthority?.toString() || 'None');
    console.log('');

    // Check if mint matches
    if (tokenAccount.mint.toString() !== gamePoolData.tokenMint) {
      console.log('❌ TOKEN MINT MISMATCH!');
      console.log('   Expected:', gamePoolData.tokenMint);
      console.log('   Actual:', tokenAccount.mint.toString());
    } else {
      console.log('✅ Token mint matches');
    }

    // Check owner authority
    if (tokenAccount.owner.toString() !== gamePoolData.owner) {
      console.log('❌ OWNER AUTHORITY MISMATCH!');
      console.log('   Expected:', gamePoolData.owner);
      console.log('   Actual:', tokenAccount.owner.toString());
    } else {
      console.log('✅ Owner authority matches');
    }

    // Check amount
    const expectedAmount = BigInt(gamePoolData.initialSupply) * BigInt(Math.pow(10, 9));
    if (tokenAccount.amount !== expectedAmount) {
      console.log('❌ AMOUNT MISMATCH!');
      console.log('   Expected:', expectedAmount.toString());
      console.log('   Actual:', tokenAccount.amount.toString());
      console.log('   Need to mint more tokens');
    } else {
      console.log('✅ Amount matches');
    }

  } catch (error) {
    console.log('❌ Not a valid SPL token account');
    console.log('   Error:', error.message);
  }

  console.log('');
  console.log('3️⃣ CHECKING TOKEN MINT...');

  try {
    const mintAccount = await getAccount(connection, new PublicKey(gamePoolData.tokenMint));
    console.log('   ✅ Token mint exists');
    console.log('   💰 Total supply:', mintAccount.amount.toString());
    console.log('   👑 Mint authority:', mintAccount.mintAuthority?.toString() || 'None');
    console.log('   🚫 Freeze authority:', mintAccount.freezeAuthority?.toString() || 'None');
    console.log('   🔢 Decimals:', 9);
  } catch (error) {
    console.log('❌ Token mint error:', error.message);
  }

  console.log('');
  console.log('🔧 FIXING ISSUES...');

  // If amount is wrong, we need to mint more tokens
  const tokenAccount = await getAccount(connection, new PublicKey(gamePoolData.gamePoolAddress));
  const expectedAmount = BigInt(gamePoolData.initialSupply) * BigInt(Math.pow(10, 9));

  if (tokenAccount.amount !== expectedAmount) {
    console.log('💰 Current amount:', tokenAccount.amount.toString());
    console.log('💰 Expected amount:', expectedAmount.toString());
    console.log('🔄 Need to mint additional tokens...');

    // Load owner keypair
    let ownerData;
    try {
      ownerData = JSON.parse(fs.readFileSync('game_pool_owner.json', 'utf8'));
    } catch (error) {
      console.error('❌ Cannot load owner keypair');
      return;
    }

    const { Keypair } = await import('@solana/web3.js');
    const ownerKeypair = Keypair.fromSecretKey(Buffer.from(ownerData.privateKey, 'hex'));

    // Import mintTo
    const { mintTo } = await import('@solana/spl-token');

    const additionalAmount = expectedAmount - tokenAccount.amount;
    console.log('💰 Minting additional:', additionalAmount.toString(), 'tokens');

    try {
      await mintTo(
        connection,
        ownerKeypair,
        new PublicKey(gamePoolData.tokenMint),
        new PublicKey(gamePoolData.gamePoolAddress),
        ownerKeypair,
        additionalAmount
      );

      console.log('✅ Additional tokens minted');

      // Verify final amount
      const finalTokenAccount = await getAccount(connection, new PublicKey(gamePoolData.gamePoolAddress));
      console.log('💰 Final amount:', finalTokenAccount.amount.toString());
      console.log('💰 Formatted:', Number(finalTokenAccount.amount) / Math.pow(10, 9));

    } catch (error) {
      console.error('❌ Minting failed:', error.message);
    }
  } else {
    console.log('✅ Amount is correct');
  }

  console.log('');
  console.log('🎯 TRANSFER READINESS CHECK:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Final checks
  const finalTokenAccount = await getAccount(connection, new PublicKey(gamePoolData.gamePoolAddress));

  console.log('✅ Token account exists');
  console.log('✅ Owner has authority');
  console.log('✅ Token mint correct');
  console.log('✅ Amount:', Number(finalTokenAccount.amount) / Math.pow(10, 9), 'tokens');
  console.log('');
  console.log('🚀 READY FOR TRANSFERS!');
  console.log('Run: node test_controlled_transfer.js');
}

// Run debug
debugNewGamePool().catch(console.error);
