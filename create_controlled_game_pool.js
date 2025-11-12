import { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';

const NETWORK = 'https://api.devnet.solana.com';
const OLD_OWNER_KEYPAIR_FILE = 'game_pool_owner.json';

async function createControlledGamePool() {
  console.log('🏗️  CREATING NEW GAME POOL WITH OUR CONTROL');
  console.log('='.repeat(50));

  // Load our controlled keypair
  let keypairData;
  try {
    keypairData = JSON.parse(fs.readFileSync(OLD_OWNER_KEYPAIR_FILE, 'utf8'));
    console.log('✅ Loaded controlled keypair');
  } catch (error) {
    console.error('❌ Cannot load keypair:', error.message);
    return;
  }

  const ourKeypair = Keypair.fromSecretKey(Buffer.from(keypairData.privateKey, 'hex'));
  console.log('👑 Our Public Key:', ourKeypair.publicKey.toString());
  console.log('💰 Our SOL Balance: Checking...');
  console.log('');

  const connection = new Connection(NETWORK, 'confirmed');

  // Check our balance
  const ourBalance = await connection.getBalance(ourKeypair.publicKey);
  const ourSol = ourBalance / 1e9;
  console.log('💰 Our SOL Balance:', ourSol.toFixed(4), 'SOL');

  if (ourSol < 0.02) {
    console.log('❌ Insufficient SOL for creating accounts');
    console.log('💡 Need at least 0.02 SOL');
    return;
  }

  console.log('');
  console.log('1️⃣ CREATING TOKEN MINT...');

  // Create new token mint
  const tokenMint = await createMint(
    connection,
    ourKeypair,
    ourKeypair.publicKey, // mint authority
    ourKeypair.publicKey, // freeze authority
    9 // decimals
  );

  console.log('✅ Token Mint Created:', tokenMint.toString());
  console.log('');

  console.log('2️⃣ CREATING GAME POOL TOKEN ACCOUNT...');

  // Create associated token account for game pool
  const gamePoolTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    ourKeypair,
    tokenMint,
    ourKeypair.publicKey
  );

  console.log('✅ Game Pool Token Account:', gamePoolTokenAccount.address.toString());
  console.log('');

  console.log('3️⃣ MINTING INITIAL TOKENS...');

  // Mint 2288 tokens to game pool
  const initialSupply = 2288;
  await mintTo(
    connection,
    ourKeypair,
    tokenMint,
    gamePoolTokenAccount.address,
    ourKeypair,
    initialSupply
  );

  console.log('✅ Minted', initialSupply, 'tokens to game pool');
  console.log('');

  console.log('4️⃣ VERIFYING CREATION...');

  // Verify the token account
  const tokenAccountInfo = await connection.getTokenAccountBalance(gamePoolTokenAccount.address);
  console.log('💰 Game Pool Balance:', tokenAccountInfo.value.uiAmount, 'tokens');
  console.log('');

  // Save the new game pool info
  const gamePoolData = {
    tokenMint: tokenMint.toString(),
    gamePoolAddress: gamePoolTokenAccount.address.toString(),
    owner: ourKeypair.publicKey.toString(),
    initialSupply: initialSupply,
    created: new Date().toISOString(),
    network: 'devnet',
    note: 'New game pool under our control'
  };

  fs.writeFileSync('new_game_pool.json', JSON.stringify(gamePoolData, null, 2));

  console.log('📄 Game pool info saved to: new_game_pool.json');
  console.log('');

  console.log('🎉 NEW GAME POOL CREATED SUCCESSFULLY!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🪙 Token Mint:', tokenMint.toString());
  console.log('🎮 Game Pool:', gamePoolTokenAccount.address.toString());
  console.log('👑 Owner:', ourKeypair.publicKey.toString());
  console.log('💰 Tokens:', initialSupply);
  console.log('');

  console.log('🔗 EXPLORER LINKS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Mint:', `https://explorer.solana.com/address/${tokenMint.toString()}?cluster=devnet`);
  console.log('Pool:', `https://explorer.solana.com/address/${gamePoolTokenAccount.address.toString()}?cluster=devnet`);
  console.log('');

  console.log('🎯 NOW YOU CAN TRANSFER TOKENS!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ We have private key for signing');
  console.log('✅ We control the game pool');
  console.log('✅ Ready for E-to-SOL claims');
  console.log('');

  console.log('🚀 TEST TRANSFER:');
  console.log('node test_controlled_transfer.js');

  return gamePoolData;
}

// Run the creation
createControlledGamePool().catch(console.error);




