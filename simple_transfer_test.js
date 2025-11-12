import { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';

const GAME_POOL = '5oU5mv3xjud2kgemjKwm5qK5Ar356rxboxbNmYXhuAJc';
const GAME_TOKEN_MINT = '2AxM2y84vg5rwP7QK7mwmBBZrDnZpXZxKTwU5vvX1FWK';
const USER_WALLET = '4UkWvx2Y59XSuhaCfeYDS56RM1WcsSdgjJ7yzLEbMyNf';

async function simpleTransferTest() {
  console.log('🧪 SIMPLE TOKEN TRANSFER TEST');
  console.log('='.repeat(40));

  console.log('🎯 Transfer 1 token from Game Pool to User Wallet');

  // Load owner keypair
  let ownerData;
  try {
    ownerData = JSON.parse(fs.readFileSync('game_pool_owner.json', 'utf8'));
  } catch (error) {
    console.error('❌ Owner keypair not found');
    return;
  }

  const ownerKeypair = Keypair.fromSecretKey(Buffer.from(ownerData.privateKey, 'hex'));
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  console.log('👑 Owner:', ownerData.publicKey);
  console.log('🎮 Pool:', GAME_POOL);
  console.log('👤 User:', USER_WALLET);
  console.log('');

  // Check owner balance
  const ownerBalance = await connection.getBalance(ownerKeypair.publicKey);
  console.log('💰 Owner SOL:', (ownerBalance / 1e9).toFixed(4), 'SOL');

  if (ownerBalance < 5000) {
    console.log('❌ Need SOL for transaction fees');
    console.log('💡 Fund owner wallet at: https://faucet.solana.com/');
    console.log('   Address:', ownerData.publicKey);
    return;
  }

  // Setup transfer
  const poolPubkey = new PublicKey(GAME_POOL);
  const userPubkey = new PublicKey(USER_WALLET);
  const tokenMintPubkey = new PublicKey(GAME_TOKEN_MINT);

  // Get user token account
  const userTokenAccount = await getAssociatedTokenAddress(tokenMintPubkey, userPubkey);
  console.log('🎫 User Token Account:', userTokenAccount.toString());

  // Create instructions
  const instructions = [];

  // Create user token account if needed
  try {
    await connection.getAccountInfo(userTokenAccount);
    console.log('✅ User token account exists');
  } catch (error) {
    console.log('📝 Creating user token account...');
    const createAccountIx = createAssociatedTokenAccountInstruction(
      ownerKeypair.publicKey, // payer
      userTokenAccount,
      userPubkey, // owner
      tokenMintPubkey
    );
    instructions.push(createAccountIx);
  }

  // Transfer 1 token
  console.log('🔄 Transferring 1 token...');
  const transferIx = createTransferInstruction(
    poolPubkey, // source
    userTokenAccount, // destination
    ownerKeypair.publicKey, // authority
    1, // amount
    [],
    TOKEN_PROGRAM_ID
  );
  instructions.push(transferIx);

  // Execute transaction
  try {
    const transaction = new Transaction().add(...instructions);
    const signature = await sendAndConfirmTransaction(connection, transaction, [ownerKeypair]);

    console.log('✅ TRANSFER SUCCESSFUL!');
    console.log('🔗 TX:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);

    console.log('\n🎉 Game Pool và User Wallet đã thông nhau!');
    console.log('✅ Token transfers hoạt động');
    console.log('✅ E-to-SOL claims ready cho production');

  } catch (error) {
    console.error('❌ Transfer failed:', error.message);
  }
}

simpleTransferTest();




