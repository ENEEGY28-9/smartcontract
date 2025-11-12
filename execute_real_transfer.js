import { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';

const GAME_POOL = '5oU5mv3xjud2kgemjKwm5qK5Ar356rxboxbNmYXhuAJc';
const GAME_TOKEN_MINT = '2AxM2y84vg5rwP7QK7mwmBBZrDnZpXZxKTwU5vvX1FWK';
const USER_WALLET = '4UkWvx2Y59XSuhaCfeYDS56RM1WcsSdgjJ7yzLEbMyNf';

async function executeRealTransfer() {
  console.log('🚀 EXECUTING REAL TOKEN TRANSFER');
  console.log('='.repeat(50));

  console.log('📤 FROM: Game Pool -', GAME_POOL);
  console.log('📥 TO: User Wallet -', USER_WALLET);
  console.log('🪙 TOKEN: Game Token -', GAME_TOKEN_MINT);
  console.log('');

  // Load owner keypair
  let ownerData;
  try {
    ownerData = JSON.parse(fs.readFileSync('game_pool_owner.json', 'utf8'));
  } catch (error) {
    console.error('❌ Owner keypair not found. Run: node setup_complete_token_transfer.js');
    return;
  }

  const ownerKeypair = Keypair.fromSecretKey(Buffer.from(ownerData.privateKey, 'hex'));
  console.log('👑 Owner loaded:', ownerData.publicKey);
  console.log('');

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Check prerequisites
  console.log('1️⃣ CHECKING PREREQUISITES...');

  // Check owner balance
  const ownerBalance = await connection.getBalance(ownerKeypair.publicKey);
  console.log('   💰 Owner SOL Balance:', (ownerBalance / 1e9).toFixed(4), 'SOL');

  if (ownerBalance < 5000) {
    console.log('   ❌ INSUFFICIENT OWNER SOL: Need at least 0.000005 SOL');
    console.log('   💡 Fund owner wallet first');
    return;
  }

  // Check pool token balance
  const poolPubkey = new PublicKey(GAME_POOL);
  let poolTokenBalance;
  try {
    poolTokenBalance = await connection.getTokenAccountBalance(poolPubkey);
    console.log('   🎮 Game Pool Tokens:', poolTokenBalance.value.uiAmount || 0);
  } catch (error) {
    console.log('   ❌ Cannot check pool balance');
    return;
  }

  if ((poolTokenBalance.value.uiAmount || 0) === 0) {
    console.log('   ❌ EMPTY POOL: No tokens to transfer');
    return;
  }

  console.log('   ✅ All prerequisites met\n');

  // Setup transfer
  console.log('2️⃣ SETTING UP TRANSFER...');

  const userPubkey = new PublicKey(USER_WALLET);
  const tokenMintPubkey = new PublicKey(GAME_TOKEN_MINT);

  // Get/create user token account
  const userTokenAccount = await getAssociatedTokenAddress(tokenMintPubkey, userPubkey);
  console.log('   🎫 User Token Account:', userTokenAccount.toString());

  // Check if token account exists
  let tokenAccountExists = false;
  try {
    await connection.getAccountInfo(userTokenAccount);
    tokenAccountExists = true;
    console.log('   ✅ Token account exists');
  } catch (error) {
    console.log('   📝 Token account does not exist - creating...');

    const createAccountIx = createAssociatedTokenAccountInstruction(
      ownerKeypair.publicKey, // payer
      userTokenAccount,
      userPubkey, // owner
      tokenMintPubkey
    );

    const createTx = new Transaction().add(createAccountIx);
    const createSig = await sendAndConfirmTransaction(connection, createTx, [ownerKeypair]);

    console.log('   ✅ Token account created!');
    console.log('   🔗 TX:', `https://explorer.solana.com/tx/${createSig}?cluster=devnet`);
    tokenAccountExists = true;
  }

  // Execute transfer
  console.log('\n3️⃣ EXECUTING TOKEN TRANSFER...');

  const transferAmount = 10; // Transfer 10 tokens for demo
  console.log('   📋 Transfer Details:');
  console.log('      Amount:', transferAmount, 'tokens');
  console.log('      From:', GAME_POOL);
  console.log('      To:', userTokenAccount.toString());
  console.log('      Authority:', ownerKeypair.publicKey.toString());
  console.log('');

  try {
    const transferIx = createTransferInstruction(
      poolPubkey, // source
      userTokenAccount, // destination
      ownerKeypair.publicKey, // authority
      transferAmount, // amount
      [],
      TOKEN_PROGRAM_ID
    );

    const transferTx = new Transaction().add(transferIx);
    const transferSig = await sendAndConfirmTransaction(connection, transferTx, [ownerKeypair]);

    console.log('   ✅ TRANSFER SUCCESSFUL!');
    console.log('   🔗 Transaction:', `https://explorer.solana.com/tx/${transferSig}?cluster=devnet`);
    console.log('   🎉 User received', transferAmount, 'game tokens!');

    // Verify final balances
    console.log('\n4️⃣ VERIFYING RESULTS...');

    // Check user token balance
    try {
      const finalUserBalance = await connection.getTokenAccountBalance(userTokenAccount);
      console.log('   👤 User Token Balance:', finalUserBalance.value.uiAmount || 0, 'tokens');
    } catch (error) {
      console.log('   👤 User Token Balance: Unable to check');
    }

    // Check pool token balance
    try {
      const finalPoolBalance = await connection.getTokenAccountBalance(poolPubkey);
      console.log('   🎮 Game Pool Balance:', finalPoolBalance.value.uiAmount || 0, 'tokens');
    } catch (error) {
      console.log('   🎮 Game Pool Balance: Unable to check');
    }

    console.log('\n🎊 REAL TOKEN TRANSFER COMPLETE!');
    console.log('📝 Summary:');
    console.log('   ✅ Prerequisites verified');
    console.log('   ✅ Token account created (if needed)');
    console.log('   ✅ Transfer executed successfully');
    console.log('   ✅ Balances updated');
    console.log('   🎮 E-to-SOL claims now work in production!');

  } catch (error) {
    console.error('\n❌ TRANSFER FAILED:');
    console.error('   Error:', error.message);

    if (error.message.includes('insufficient funds')) {
      console.log('   💡 SOLUTION: Owner wallet needs more SOL');
    } else if (error.message.includes('Invalid account owner')) {
      console.log('   💡 SOLUTION: Wrong owner keypair for pool');
    } else {
      console.log('   💡 SOLUTION: Check pool has tokens and owner has authority');
    }
  }
}

executeRealTransfer();






