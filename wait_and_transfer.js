import { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction, getTokenAccountBalance } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';

const GAME_POOL = '5oU5mv3xjud2kgemjKwm5qK5Ar356rxboxbNmYXhuAJc';
const GAME_TOKEN_MINT = '2AxM2y84vg5rwP7QK7mwmBBZrDnZpXZxKTwU5vvX1FWK';
const USER_WALLET = '4UkWvx2Y59XSuhaCfeYDS56RM1WcsSdgjJ7yzLEbMyNf';

async function waitAndTransfer() {
  console.log('⏳ WAITING FOR OWNER FUNDING THEN TRANSFER TOKENS');
  console.log('='.repeat(60));

  console.log('🎯 GOAL: Transfer 1 token from Game Pool to User Wallet');
  console.log('📋 Requirements:');
  console.log('   - Owner wallet must have SOL for transaction fees');
  console.log('   - Game pool must have tokens to transfer');
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
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  console.log('📧 Owner Wallet:', ownerData.publicKey);
  console.log('🎮 Game Pool:', GAME_POOL);
  console.log('👤 User Wallet:', USER_WALLET);
  console.log('');

  console.log('💰 FUNDING INSTRUCTIONS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. Open: https://faucet.solana.com/');
  console.log('2. Select: Devnet');
  console.log('3. Paste:', ownerData.publicKey);
  console.log('4. Request: 1 SOL');
  console.log('5. Wait: 30 seconds');
  console.log('6. This script will auto-detect and proceed with transfer!');
  console.log('');

  // Monitor owner balance
  console.log('👀 MONITORING OWNER BALANCE...\n');

  let lastBalance = 0;
  let checks = 0;
  const maxChecks = 600; // 10 minutes

  while (checks < maxChecks) {
    try {
      const currentBalance = await connection.getBalance(ownerKeypair.publicKey);

      if (currentBalance !== lastBalance && checks > 0) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] 💰 OWNER BALANCE: ${(currentBalance / 1e9).toFixed(4)} SOL (+${((currentBalance - lastBalance) / 1e9).toFixed(4)})`);
      }

      if (currentBalance >= 5000) { // Sufficient for transaction
        console.log(`\n🎉 OWNER WALLET FUNDED! (${(currentBalance / 1e9).toFixed(4)} SOL)`);
        console.log('🚀 PROCEEDING WITH TOKEN TRANSFER...\n');

        await executeTokenTransfer(ownerKeypair, connection);
        return;
      }

      lastBalance = currentBalance;
      checks++;

      if (checks % 30 === 0) { // Every 30 seconds
        const minutes = Math.floor(checks / 60);
        const seconds = (checks % 60);
        console.log(`⏳ Still waiting... (${minutes}:${seconds.toString().padStart(2, '0')}) - Balance: ${(lastBalance / 1e9).toFixed(4)} SOL`);
      }

    } catch (error) {
      console.error('❌ Balance check error:', error.message);
    }

    await new Promise(resolve => setTimeout(resolve, 1000)); // Check every second
  }

  console.log('\n⏰ MONITORING TIMEOUT (10 minutes)');
  console.log('💡 Fund owner wallet and run this script again');
}

async function executeTokenTransfer(ownerKeypair, connection) {
  console.log('🔄 EXECUTING TOKEN TRANSFER...');
  console.log('📤 From: Game Pool -', GAME_POOL);
  console.log('📥 To: User Wallet -', USER_WALLET);
  console.log('🪙 Amount: 1 token\n');

  try {
    const poolPubkey = new PublicKey(GAME_POOL);
    const userPubkey = new PublicKey(USER_WALLET);
    const tokenMintPubkey = new PublicKey(GAME_TOKEN_MINT);

    // Check pool balance before transfer
    const poolBalanceBefore = await getTokenAccountBalance(connection, poolPubkey);
    console.log('📊 Before Transfer:');
    console.log('   🎮 Game Pool:', poolBalanceBefore.value.uiAmount || 0, 'tokens');

    // Get user token account
    const userTokenAccount = await getAssociatedTokenAddress(tokenMintPubkey, userPubkey);

    // Check if user token account exists
    let userBalanceBefore = 0;
    try {
      const userBalance = await getTokenAccountBalance(connection, userTokenAccount);
      userBalanceBefore = userBalance.value.uiAmount || 0;
      console.log('   👤 User Wallet:', userBalanceBefore, 'tokens');
    } catch (error) {
      console.log('   👤 User Token Account: Does not exist (will be created)');
    }

    console.log('');

    // Create transfer instruction
    const transferAmount = 1;
    const instructions = [];

    // Create user token account if needed
    try {
      await connection.getAccountInfo(userTokenAccount);
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

    // Add transfer instruction
    const transferIx = createTransferInstruction(
      poolPubkey, // source
      userTokenAccount, // destination
      ownerKeypair.publicKey, // authority
      transferAmount, // amount
      [],
      TOKEN_PROGRAM_ID
    );
    instructions.push(transferIx);

    // Execute transaction
    console.log('⚡ Sending transaction...');
    const transaction = new Transaction().add(...instructions);
    const signature = await sendAndConfirmTransaction(connection, transaction, [ownerKeypair]);

    console.log('✅ TRANSACTION SUCCESSFUL!');
    console.log('🔗 Signature:', signature);
    console.log('🌐 Explorer:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);

    // Verify results
    console.log('\n📊 After Transfer:');

    const poolBalanceAfter = await getTokenAccountBalance(connection, poolPubkey);
    const userBalanceAfter = await getTokenAccountBalance(connection, userTokenAccount);

    console.log('   🎮 Game Pool:', poolBalanceAfter.value.uiAmount || 0, 'tokens');
    console.log('   👤 User Wallet:', userBalanceAfter.value.uiAmount || 0, 'tokens');

    const poolChange = (poolBalanceAfter.value.uiAmount || 0) - (poolBalanceBefore.value.uiAmount || 0);
    const userChange = (userBalanceAfter.value.uiAmount || 0) - userBalanceBefore;

    console.log('\n📈 Changes:');
    console.log('   🎮 Game Pool:', poolChange, 'tokens');
    console.log('   👤 User Wallet:', userChange, 'tokens');

    if (poolChange === -1 && userChange === 1) {
      console.log('\n🎉 PERFECT! TOKEN TRANSFER SUCCESSFUL!');
      console.log('✅ 2 ví đã thông nhau hoàn toàn!');
      console.log('✅ Game pool có thể transfer tokens');
      console.log('✅ User wallet có thể nhận tokens');
      console.log('✅ E-to-SOL claims sẽ hoạt động trong game!');
    } else {
      console.log('\n⚠️ Unexpected balance changes - check transaction details');
    }

  } catch (error) {
    console.error('\n❌ TRANSFER FAILED:');
    console.error('Error:', error.message);

    if (error.message.includes('insufficient funds')) {
      console.log('💡 Owner wallet needs more SOL');
    } else {
      console.log('💡 Check game pool has tokens and owner has authority');
    }
  }
}

waitAndTransfer();
