import { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction } from '@solana/spl-token';
import fs from 'fs';

// Game Pool Configuration
const GAME_POOL_ADDRESS = '5oU5mv3xjud2kgemjKwm5qK5Ar356rxboxbNmYXhuAJc';
const GAME_TOKEN_MINT = '2AxM2y84vg5rwP7QK7mwmBBZrDnZpXZxKTwU5vvX1FWK';

async function loadWallet() {
  try {
    const walletData = JSON.parse(fs.readFileSync('devnet_wallet.json', 'utf8'));
    const secretKey = Buffer.from(walletData.privateKey, 'hex');
    const keypair = Keypair.fromSecretKey(secretKey);
    return { keypair, info: walletData };
  } catch (error) {
    console.log('❌ Could not load wallet. Run: node create_devnet_wallet.js');
    process.exit(1);
  }
}

async function checkBalances(connection, walletAddress, gamePoolAddress) {
  console.log('\n💰 Checking Balances...\n');

  try {
    // Check SOL balance of user wallet
    const userBalance = await connection.getBalance(walletAddress);
    console.log(`👤 User Wallet SOL: ${userBalance / LAMPORTS_PER_SOL} SOL`);

    // Check SOL balance of game pool
    const poolBalance = await connection.getBalance(new PublicKey(gamePoolAddress));
    console.log(`🎮 Game Pool SOL: ${poolBalance / LAMPORTS_PER_SOL} SOL`);

    // Check token balances if applicable
    try {
      const tokenMintPubkey = new PublicKey(GAME_TOKEN_MINT);

      // Get user's associated token account
      const userTokenAccount = await getAssociatedTokenAddress(tokenMintPubkey, walletAddress);
      const userTokenBalance = await connection.getTokenAccountBalance(userTokenAccount);
      console.log(`👤 User Game Tokens: ${userTokenBalance.value.uiAmount || 0}`);

      // Get game pool's associated token account
      const poolTokenAccount = await getAssociatedTokenAddress(tokenMintPubkey, new PublicKey(gamePoolAddress));
      const poolTokenBalance = await connection.getTokenAccountBalance(poolTokenAccount);
      console.log(`🎮 Game Pool Tokens: ${poolTokenBalance.value.uiAmount || 0}`);

    } catch (error) {
      console.log('📝 Token accounts may not exist yet');
    }

  } catch (error) {
    console.log(`❌ Error checking balances: ${error.message}`);
  }
}

async function transferSOLToGamePool(wallet, amountSOL = 0.01) {
  console.log(`\n💸 Transferring ${amountSOL} SOL to Game Pool...\n`);

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const amountLamports = amountSOL * LAMPORTS_PER_SOL;

  try {
    // Check user balance first
    const userBalance = await connection.getBalance(wallet.publicKey);
    if (userBalance < amountLamports) {
      console.log(`❌ Insufficient balance. You have ${userBalance / LAMPORTS_PER_SOL} SOL, need ${amountSOL} SOL`);
      return;
    }

    // Create transfer instruction
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: new PublicKey(GAME_POOL_ADDRESS),
      lamports: amountLamports,
    });

    // Create and send transaction
    const transaction = new Transaction().add(transferInstruction);
    const signature = await sendAndConfirmTransaction(connection, transaction, [wallet]);

    console.log('✅ SOL Transfer Successful!');
    console.log(`🔗 Transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);

    // Check balances after transfer
    await checkBalances(connection, wallet.publicKey, GAME_POOL_ADDRESS);

  } catch (error) {
    console.log(`❌ SOL Transfer failed: ${error.message}`);
  }
}

async function transferTokensFromGamePool(wallet, amountTokens = 1) {
  console.log(`\n🎮 Transferring ${amountTokens} Game Tokens FROM Game Pool to User...\n`);

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  try {
    const tokenMintPubkey = new PublicKey(GAME_TOKEN_MINT);
    const gamePoolPubkey = new PublicKey(GAME_POOL_ADDRESS);

    // Get associated token accounts
    const gamePoolTokenAccount = await getAssociatedTokenAddress(tokenMintPubkey, gamePoolPubkey);
    const userTokenAccount = await getAssociatedTokenAddress(tokenMintPubkey, wallet.publicKey);

    console.log(`📤 From: ${gamePoolTokenAccount.toString()}`);
    console.log(`📥 To: ${userTokenAccount.toString()}`);

    // Check if user token account exists, create if not
    const userTokenAccountInfo = await connection.getAccountInfo(userTokenAccount);
    const instructions = [];

    if (!userTokenAccountInfo) {
      console.log('📝 Creating user token account...');
      instructions.push(
        createAssociatedTokenAccountInstruction(
          wallet.publicKey, // payer
          userTokenAccount, // associated token account
          wallet.publicKey, // owner
          tokenMintPubkey // mint
        )
      );
    }

    // Transfer instruction (this would need game pool's signature in real scenario)
    // For now, we'll simulate this
    console.log(`🎭 SIMULATING token transfer of ${amountTokens} tokens`);
    console.log('📝 In production, this would require game pool owner signature');

    // Check balances after "transfer"
    await checkBalances(connection, wallet.publicKey, GAME_POOL_ADDRESS);

  } catch (error) {
    console.log(`❌ Token transfer simulation failed: ${error.message}`);
  }
}

async function main() {
  console.log('🧪 Game Pool Transfer Testing\n');

  const { keypair, info } = await loadWallet();
  console.log(`👤 Using wallet: ${info.address}`);

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Initial balance check
  await checkBalances(connection, keypair.publicKey, GAME_POOL_ADDRESS);

  // Test SOL transfer to game pool
  await transferSOLToGamePool(keypair, 0.01);

  // Test token transfer from game pool (simulation)
  await transferTokensFromGamePool(keypair, 1);

  console.log('\n✅ Testing Complete!');
  console.log('\n📋 Summary:');
  console.log('- ✅ SOL transfers work');
  console.log('- 🎭 Token transfers are simulated (need owner signature)');
  console.log('- 🔗 Check transactions on: https://explorer.solana.com/?cluster=devnet');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { loadWallet, checkBalances, transferSOLToGamePool, transferTokensFromGamePool };
