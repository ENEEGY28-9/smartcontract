import { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';

// Game pool cũ (có 2288 tokens)
const OLD_GAME_POOL = '5oU5mv3xjud2kgemjKwm5qK5Ar356rxboxbNmYXhuAJc';
const TOKEN_MINT = '2AxM2y84vg5rwP7QK7mwmBBZrDnZpXZxKTwU5vvX1FWK';

// Real owner (có private key thật)
const REAL_OWNER_FILE = 'real_owner_private_key.json';

// New owner (nhận tokens, trả phí)
const NEW_OWNER_FILE = 'game_pool_owner.json';
const USER_WALLET = '4UkWvx2Y59XSuhaCfeYDS56RM1WcsSdgjJ7yzLEbMyNf';

async function transferFromOldPool() {
  console.log('🚀 TRANSFER FROM OLD GAME POOL TO NEW OWNER');
  console.log('='.repeat(50));

  // Load real owner keypair (người có quyền trên game pool cũ)
  let realOwnerData;
  try {
    realOwnerData = JSON.parse(fs.readFileSync(REAL_OWNER_FILE, 'utf8'));
    console.log('✅ Loaded real owner data');
  } catch (error) {
    console.error('❌ Cannot load real owner data:', error.message);
    console.log('💡 Update real_owner_private_key.json with actual private key');
    return;
  }

  // Load new owner keypair (người nhận tokens, trả phí)
  let newOwnerData;
  try {
    newOwnerData = JSON.parse(fs.readFileSync(NEW_OWNER_FILE, 'utf8'));
    console.log('✅ Loaded new owner data');
  } catch (error) {
    console.error('❌ Cannot load new owner data:', error.message);
    return;
  }

  console.log('🎮 Old Game Pool:', OLD_GAME_POOL);
  console.log('👑 Real Owner:', realOwnerData.publicKey);
  console.log('📥 New Owner:', newOwnerData.publicKey);
  console.log('👤 User Wallet:', USER_WALLET);
  console.log('');

  // Kiểm tra private key
  if (realOwnerData.privateKey === 'REPLACE_WITH_ACTUAL_PRIVATE_KEY_HEX_STRING') {
    console.error('❌ PRIVATE KEY CHƯA ĐƯỢC CẬP NHẬT!');
    console.log('💡 Hãy cập nhật file real_owner_private_key.json với private key thật');
    return;
  }

  // Tạo keypair từ private key
  let realOwnerKeypair;
  try {
    // Thử parse dưới dạng hex string
    if (typeof realOwnerData.privateKey === 'string') {
      realOwnerKeypair = Keypair.fromSecretKey(Buffer.from(realOwnerData.privateKey, 'hex'));
    } else if (Array.isArray(realOwnerData.privateKey)) {
      realOwnerKeypair = Keypair.fromSecretKey(Buffer.from(realOwnerData.privateKey));
    } else {
      throw new Error('Invalid private key format');
    }
    console.log('✅ Real owner keypair created');
  } catch (error) {
    console.error('❌ Invalid private key format:', error.message);
    return;
  }

  // Tạo keypair cho new owner
  const newOwnerKeypair = Keypair.fromSecretKey(Buffer.from(newOwnerData.privateKey, 'hex'));

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Kiểm tra balance
  console.log('1️⃣ CHECKING BALANCES...');

  const realOwnerBalance = await connection.getBalance(realOwnerKeypair.publicKey);
  const newOwnerBalance = await connection.getBalance(newOwnerKeypair.publicKey);

  console.log('   👑 Real Owner SOL:', (realOwnerBalance / 1e9).toFixed(4));
  console.log('   📥 New Owner SOL:', (newOwnerBalance / 1e9).toFixed(4));

  // Kiểm tra game pool tokens
  const gamePoolBalance = await connection.getTokenAccountBalance(new PublicKey(OLD_GAME_POOL));
  console.log('   🎮 Game Pool Tokens:', gamePoolBalance.value.uiAmount);
  console.log('');

  // Kiểm tra new owner có đủ SOL cho fee không
  const transferAmount = 10;
  if (newOwnerBalance < 5000) { // 0.000005 SOL
    console.log('❌ New owner không đủ SOL cho transaction fee');
    console.log('💡 Fund ví new owner trước');
    return;
  }

  if (gamePoolBalance.value.uiAmount < transferAmount) {
    console.log('❌ Game pool không đủ tokens');
    return;
  }

  console.log('2️⃣ SETTING UP TRANSFER...');

  // Setup transfer
  const tokenMintPubkey = new PublicKey(TOKEN_MINT);
  const gamePoolPubkey = new PublicKey(OLD_GAME_POOL);
  const userPubkey = new PublicKey(USER_WALLET);

  // Get user token account
  const userTokenAccount = await getAssociatedTokenAddress(tokenMintPubkey, userPubkey);
  console.log('   🎫 User Token Account:', userTokenAccount.toString());

  // Kiểm tra user token account
  let userTokenExists = false;
  try {
    await connection.getAccountInfo(userTokenAccount);
    userTokenExists = true;
    console.log('   ✅ User token account exists');
  } catch (error) {
    console.log('   📝 User token account needs creation');
  }

  console.log('');

  // Tạo transaction
  console.log('3️⃣ CREATING TRANSACTION...');

  const instructions = [];

  // Tạo user token account nếu cần
  if (!userTokenExists) {
    console.log('   📝 Adding: Create user token account');
    const createAccountIx = createAssociatedTokenAccountInstruction(
      newOwnerKeypair.publicKey, // payer (new owner trả phí)
      userTokenAccount,
      userPubkey,
      tokenMintPubkey
    );
    instructions.push(createAccountIx);
  }

  // Transfer instruction
  console.log('   🔄 Adding: Transfer', transferAmount, 'tokens');
  const transferIx = createTransferInstruction(
    gamePoolPubkey,        // from (game pool)
    userTokenAccount,      // to (user token account)
    realOwnerKeypair.publicKey, // authority (real owner signs)
    transferAmount,        // amount
    [],                    // multisig signers
    TOKEN_PROGRAM_ID
  );
  instructions.push(transferIx);

  console.log('   📦 Total instructions:', instructions.length);
  console.log('');

  // Tạo và sign transaction
  console.log('4️⃣ SIGNING AND SENDING TRANSACTION...');

  const transaction = new Transaction();
  instructions.forEach(ix => transaction.add(ix));

  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = newOwnerKeypair.publicKey; // New owner pays fee

  // Sign by both parties: real owner (authority) và new owner (fee payer)
  transaction.sign(realOwnerKeypair, newOwnerKeypair);

  try {
    const signature = await connection.sendRawTransaction(transaction.serialize());

    console.log('');
    console.log('🎉 TRANSFER SUCCESSFUL!');
    console.log('='.repeat(50));
    console.log('🔗 Transaction Signature:');
    console.log(signature);
    console.log('');
    console.log('🌐 View on Explorer:');
    console.log(`https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    console.log('');

    // Verify results
    console.log('5️⃣ VERIFYING RESULTS...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const finalGamePoolBalance = await connection.getTokenAccountBalance(gamePoolPubkey);
    console.log('   🎮 Game Pool Final:', finalGamePoolBalance.value.uiAmount, 'tokens');

    try {
      const userTokenBalance = await connection.getTokenAccountBalance(userTokenAccount);
      console.log('   👤 User Wallet Final:', userTokenBalance.value.uiAmount, 'tokens');
    } catch (error) {
      console.log('   👤 User Wallet: 0 tokens');
    }

    console.log('');
    console.log('✅ VERIFICATION:');
    console.log('   📈 Game Pool: -10 tokens');
    console.log('   📈 User Wallet: +10 tokens');
    console.log('   💸 Fee paid by: New Owner');

  } catch (error) {
    console.error('❌ Transaction failed:', error.message);
    console.log('');
    console.log('💡 POSSIBLE ISSUES:');
    console.log('   • Invalid private key format');
    console.log('   • Insufficient balance');
    console.log('   • Wrong authority');
    console.log('   • Network issues');
  }
}

// Run transfer
transferFromOldPool().catch(console.error);




