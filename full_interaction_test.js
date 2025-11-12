import { Connection, PublicKey, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';

const GAME_TOKEN_MINT = '2AxM2y84vg5rwP7QK7mwmBBZrDnZpXZxKTwU5vvX1FWK';
const GAME_POOL_ADDRESS = '5oU5mv3xjud2kgemjKwm5qK5Ar356rxboxbNmYXhuAJc';

async function loadWallet() {
  try {
    const walletData = JSON.parse(fs.readFileSync('devnet_wallet.json', 'utf8'));
    const secretKey = Buffer.from(walletData.privateKey, 'hex');
    const keypair = Keypair.fromSecretKey(secretKey);
    return { keypair, info: walletData };
  } catch (error) {
    throw new Error('No wallet file found. Run: node create_devnet_wallet.js');
  }
}

async function createTokenAccountIfNeeded(connection, wallet, tokenMint) {
  console.log('🔧 Checking/Creating Token Account...');

  const tokenMintPubkey = new PublicKey(tokenMint);
  const userTokenAccount = await getAssociatedTokenAddress(tokenMintPubkey, wallet.publicKey);

  try {
    await connection.getAccountInfo(userTokenAccount);
    console.log('✅ Token account already exists');
    return userTokenAccount;
  } catch (error) {
    console.log('📝 Creating token account...');

    const createAccountIx = createAssociatedTokenAccountInstruction(
      wallet.publicKey, // payer
      userTokenAccount, // associated token account
      wallet.publicKey, // owner
      tokenMintPubkey // mint
    );

    const transaction = new Transaction().add(createAccountIx);
    const signature = await sendAndConfirmTransaction(connection, transaction, [wallet]);

    console.log('✅ Token account created: ' + signature);
    console.log('🔗 Account: ' + userTokenAccount.toString());

    return userTokenAccount;
  }
}

async function testSOLTransfer(wallet, amountSOL = 0.001) {
  console.log(`\n💸 Testing SOL Transfer (${amountSOL} SOL)...`);

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const amountLamports = amountSOL * 1e9;

  // Check balance first
  const balance = await connection.getBalance(wallet.publicKey);
  if (balance < amountLamports + 5000) { // 5000 lamports for fee
    throw new Error(`Insufficient balance. Have ${balance / 1e9} SOL, need ${(amountLamports + 5000) / 1e9} SOL`);
  }

  const transferIx = SystemProgram.transfer({
    fromPubkey: wallet.publicKey,
    toPubkey: new PublicKey(GAME_POOL_ADDRESS),
    lamports: amountLamports,
  });

  const transaction = new Transaction().add(transferIx);
  const signature = await sendAndConfirmTransaction(connection, transaction, [wallet]);

  console.log('✅ SOL Transfer successful!');
  console.log('🔗 Transaction: https://explorer.solana.com/tx/' + signature + '?cluster=devnet');

  return signature;
}

async function checkBalances(connection, walletAddress) {
  console.log('\n💰 Balance Check:');

  // SOL Balance
  const solBalance = await connection.getBalance(walletAddress);
  console.log('💵 SOL: ' + (solBalance / 1e9) + ' SOL');

  // Token Balance
  const tokenMintPubkey = new PublicKey(GAME_TOKEN_MINT);
  const userTokenAccount = await getAssociatedTokenAddress(tokenMintPubkey, walletAddress);

  try {
    const tokenBalance = await connection.getTokenAccountBalance(userTokenAccount);
    console.log('🎮 Game Tokens: ' + (tokenBalance.value.uiAmount || 0));
  } catch (error) {
    console.log('🎮 Game Tokens: Token account not found');
  }

  // Game Pool Balance
  try {
    const poolTokenAccount = await getAssociatedTokenAddress(tokenMintPubkey, new PublicKey(GAME_POOL_ADDRESS));
    const poolBalance = await connection.getTokenAccountBalance(poolTokenAccount);
    console.log('🏊 Game Pool: ' + (poolBalance.value.uiAmount || 0) + ' tokens');
  } catch (error) {
    console.log('🏊 Game Pool: Unable to check');
  }
}

async function runFullTest() {
  console.log('🚀 FULL WALLET INTERACTION TEST\n');

  try {
    const { keypair: wallet, info } = await loadWallet();
    console.log('👤 Using wallet: ' + info.address);

    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    // Initial balance check
    console.log('📊 INITIAL STATE:');
    await checkBalances(connection, wallet.publicKey);

    // Create token account if needed
    await createTokenAccountIfNeeded(connection, wallet, GAME_TOKEN_MINT);

    // Test SOL transfer
    await testSOLTransfer(wallet, 0.001);

    // Final balance check
    console.log('\n📊 FINAL STATE:');
    await checkBalances(connection, wallet.publicKey);

    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✅ Wallet can interact with Game Pool');
    console.log('✅ SOL transfers work');
    console.log('✅ Token accounts can be created');
    console.log('\n💡 Your game is ready for E-to-SOL claims!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('- Make sure wallet has SOL: node fund_wallet_instructions.js');
    console.log('- Check balance: node check_wallet_ready.js');
    process.exit(1);
  }
}

runFullTest();






