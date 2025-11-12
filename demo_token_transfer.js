import { Connection, PublicKey, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';

const USER_WALLET = '4UkWvx2Y59XSuhaCfeYDS56RM1WcsSdgjJ7yzLEbMyNf';
const GAME_POOL = '5oU5mv3xjud2kgemjKwm5qK5Ar356rxboxbNmYXhuAJc';
const GAME_TOKEN_MINT = '2AxM2y84vg5rwP7QK7mwmBBZrDnZpXZxKTwU5vvX1FWK';

async function demoTokenTransfer() {
  console.log('🎭 DEMO: TOKEN TRANSFER FROM GAME POOL TO USER WALLET');
  console.log('='.repeat(60));

  console.log('📤 FROM: Game Pool -', GAME_POOL);
  console.log('📥 TO: User Wallet -', USER_WALLET);
  console.log('🪙 TOKEN: Game Token -', GAME_TOKEN_MINT);
  console.log('');

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  try {
    // Load user wallet
    const walletData = JSON.parse(fs.readFileSync('devnet_wallet.json', 'utf8'));
    const userWallet = Keypair.fromSecretKey(Buffer.from(walletData.privateKey, 'hex'));

    console.log('1️⃣ CHECKING PREREQUISITES...');

    // Check user SOL balance
    const userBalance = await connection.getBalance(userWallet.publicKey);
    console.log('   💰 User SOL Balance:', (userBalance / 1e9).toFixed(4), 'SOL');

    if (userBalance < 5000) { // Minimum for transaction
      console.log('   ❌ INSUFFICIENT SOL: Need at least 0.000005 SOL for fees');
      console.log('   💡 SOLUTION: Fund wallet with SOL first');
      console.log('   🌐 Faucet: https://faucet.solana.com/');
      return;
    }

    // Check game pool token balance
    const poolPubkey = new PublicKey(GAME_POOL);
    const tokenMintPubkey = new PublicKey(GAME_TOKEN_MINT);

    try {
      const poolTokenBalance = await connection.getTokenAccountBalance(poolPubkey);
      console.log('   🎮 Game Pool Tokens:', poolTokenBalance.value.uiAmount || 0);

      if ((poolTokenBalance.value.uiAmount || 0) === 0) {
        console.log('   ❌ EMPTY POOL: Game pool has no tokens to transfer');
        return;
      }
    } catch (error) {
      console.log('   ❌ CANNOT CHECK POOL: Game pool balance unavailable');
      return;
    }

    console.log('   ✅ All prerequisites met');
    console.log('');

    // 2. Create user token account if needed
    console.log('2️⃣ SETTING UP TOKEN ACCOUNT...');
    const userTokenAccount = await getAssociatedTokenAddress(tokenMintPubkey, userWallet.publicKey);

    // Check if token account exists
    let tokenAccountExists = false;
    try {
      await connection.getAccountInfo(userTokenAccount);
      tokenAccountExists = true;
      console.log('   ✅ User token account exists');
    } catch (error) {
      console.log('   📝 User token account does not exist - will create');
    }

    if (!tokenAccountExists) {
      console.log('   🔄 Creating user token account...');

      const createAccountIx = createAssociatedTokenAccountInstruction(
        userWallet.publicKey, // payer
        userTokenAccount, // associated token account
        userWallet.publicKey, // owner
        tokenMintPubkey // mint
      );

      const transaction = new Transaction().add(createAccountIx);
      const signature = await sendAndConfirmTransaction(connection, transaction, [userWallet]);

      console.log('   ✅ Token account created!');
      console.log('   🔗 Account:', userTokenAccount.toString());
      console.log('   📄 TX:', 'https://explorer.solana.com/tx/' + signature + '?cluster=devnet');
    }

    console.log('');

    // 3. Attempt token transfer (this will fail without pool owner signature)
    console.log('3️⃣ ATTEMPTING TOKEN TRANSFER...');
    console.log('   ⚠️  NOTE: This will fail because we need game pool owner signature');
    console.log('   🎭 This demonstrates the technical requirement');

    const transferAmount = 1; // 1 token for demo

    // This transfer instruction would need to be signed by game pool owner
    const transferIx = createTransferInstruction(
      poolPubkey, // source
      userTokenAccount, // destination
      poolPubkey, // owner (this is the problem - we don't have the owner keypair)
      transferAmount,
      [],
      TOKEN_PROGRAM_ID
    );

    console.log('   📋 Transfer Details:');
    console.log('      Amount:', transferAmount, 'tokens');
    console.log('      From:', GAME_POOL);
    console.log('      To:', userTokenAccount.toString());
    console.log('      Owner needed:', poolPubkey.toString());

    console.log('');
    console.log('   ❌ EXPECTED RESULT: Transaction will fail');
    console.log('   🎯 REASON: Missing game pool owner signature');
    console.log('   💡 SOLUTION: Game backend must sign with owner private key');

    // Try the transfer (will fail)
    try {
      const transaction = new Transaction().add(transferIx);
      // This would fail because we're signing with user wallet, not pool owner
      const signature = await sendAndConfirmTransaction(connection, transaction, [userWallet]);
      console.log('   🤔 Unexpected success:', signature);
    } catch (error) {
      console.log('   ✅ Expected failure:', error.message.substring(0, 100) + '...');
    }

    console.log('');
    console.log('🎯 DEMO CONCLUSION:');
    console.log('   ✅ User wallet can create token accounts');
    console.log('   ✅ User wallet has SOL for fees');
    console.log('   ✅ Game pool has tokens to transfer');
    console.log('   ❌ Missing: Game pool owner private key for signing');
    console.log('   🎮 In production: Backend signs transfers with owner key');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  }
}

demoTokenTransfer();






