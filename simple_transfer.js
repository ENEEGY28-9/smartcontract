import { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { createTransferInstruction, TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import fs from 'fs';

const GAME_POOL_DATA_FILE = 'new_game_pool.json';
const USER_WALLET = '4UkWvx2Y59XSuhaCfeYDS56RM1WcsSdgjJ7yzLEbMyNf';

async function simpleTransfer() {
  console.log('🚀 SIMPLE TOKEN TRANSFER FROM GAME POOL');
  console.log('='.repeat(50));

  // Load game pool data
  let gamePoolData;
  try {
    gamePoolData = JSON.parse(fs.readFileSync(GAME_POOL_DATA_FILE, 'utf8'));
  } catch (error) {
    console.error('❌ Cannot load game pool data');
    return;
  }

  // Load owner keypair
  let ownerData;
  try {
    ownerData = JSON.parse(fs.readFileSync('game_pool_owner.json', 'utf8'));
  } catch (error) {
    console.error('❌ Cannot load owner keypair');
    return;
  }

  const ownerKeypair = Keypair.fromSecretKey(Buffer.from(ownerData.privateKey, 'hex'));
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  console.log('🎮 Game Pool:', gamePoolData.gamePoolAddress);
  console.log('🪙 Token Mint:', gamePoolData.tokenMint);
  console.log('👑 Owner:', gamePoolData.owner);
  console.log('👤 User Wallet:', USER_WALLET);
  console.log('');

  // Check balances
  const ownerBalance = await connection.getBalance(ownerKeypair.publicKey);
  const gamePoolBalance = await connection.getTokenAccountBalance(new PublicKey(gamePoolData.gamePoolAddress));

  console.log('💰 Owner SOL:', (ownerBalance / 1e9).toFixed(4));
  console.log('🎮 Game Pool Tokens:', gamePoolBalance.value.uiAmount);
  console.log('');

  // Setup transfer
  const tokenMintPubkey = new PublicKey(gamePoolData.tokenMint);
  const gamePoolPubkey = new PublicKey(gamePoolData.gamePoolAddress);
  const userPubkey = new PublicKey(USER_WALLET);

  // Get user token account
  const userTokenAccount = await getAssociatedTokenAddress(tokenMintPubkey, userPubkey);
  console.log('🎫 User Token Account:', userTokenAccount.toString());

  // Check if user token account exists
  try {
    await connection.getAccountInfo(userTokenAccount);
    console.log('✅ User token account exists');
  } catch (error) {
    console.log('❌ User token account does not exist');
    console.log('💡 Please run transfer with account creation first');
    return;
  }

  console.log('');

  // Create transfer transaction
  console.log('🔄 CREATING TRANSFER TRANSACTION...');

  const transferAmount = 1; // Transfer 1 token
  const transferIx = createTransferInstruction(
    gamePoolPubkey,
    userTokenAccount,
    ownerKeypair.publicKey,
    transferAmount,
    [],
    TOKEN_PROGRAM_ID
  );

  const transaction = new Transaction().add(transferIx);

  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = ownerKeypair.publicKey;

  console.log('📋 Transfer Details:');
  console.log('   📤 From:', gamePoolData.gamePoolAddress);
  console.log('   📥 To:', userTokenAccount.toString());
  console.log('   💰 Amount:', transferAmount, 'tokens');
  console.log('');

  // Sign and send
  console.log('✍️ SIGNING AND SENDING...');

  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [ownerKeypair]
    );

    console.log('');
    console.log('🎉 TRANSFER SUCCESSFUL!');
    console.log('='.repeat(50));
    console.log('🔗 Signature:', signature);
    console.log('🌐 Explorer:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    console.log('');

    // Verify results
    console.log('✅ VERIFYING RESULTS...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const finalGamePoolBalance = await connection.getTokenAccountBalance(gamePoolPubkey);
    const userTokenBalance = await connection.getTokenAccountBalance(userTokenAccount);

    console.log('🎮 Game Pool Final:', finalGamePoolBalance.value.uiAmount, 'tokens');
    console.log('👤 User Wallet Final:', userTokenBalance.value.uiAmount, 'tokens');

    console.log('');
    console.log('✅ SUCCESS: Transfer completed successfully!');

  } catch (error) {
    console.error('❌ Transfer failed:', error.message);
  }
}

// Run transfer
simpleTransfer().catch(console.error);




