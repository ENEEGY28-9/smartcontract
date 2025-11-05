const {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} = require('@solana/web3.js');
const {
  TOKEN_PROGRAM_ID,
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAccount,
  getMint,
  getAssociatedTokenAddress,
} = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');

// Load wallet keypair
const keypairPath = path.join(process.env.HOME || process.env.USERPROFILE, '.config', 'solana', 'id.json');
const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
const payer = Keypair.fromSecretKey(new Uint8Array(keypairData));

async function mintAdditionalTokens() {
  console.log('🚀 MINTING ADDITIONAL TOKENS - 80/20 LOGIC\n');

  // Connect to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Use existing deployment addresses (80/20 logic)
  const gameTokenMint = new PublicKey('2AxM2y84vg5rwP7QK7mwmBBZrDnZpXZxKTwU5vvX1FWK');
  const gamePoolAccount = new PublicKey('BwnPAXJ7FSQQkirnXzvLsELk5crhLxbzArwtcfgrGp19');
  const ownerAccount = new PublicKey('8unZYfU5Xm1DCgnSt12jjqwXP1ifcMUSbFFerbBN8WYS');

  console.log('📍 Using 80/20 Logic Addresses:');
  console.log(`Game Token Mint: ${gameTokenMint.toString()}`);
  console.log(`Game Pool: ${gamePoolAccount.toString()}`);
  console.log(`Owner Wallet: ${ownerAccount.toString()}\n`);

  // Check balances before minting
  console.log('💰 BALANCES BEFORE MINTING:');
  const gameBalanceBefore = Number((await getAccount(connection, gamePoolAccount)).amount) / 1_000_000;
  const ownerBalanceBefore = Number((await getAccount(connection, ownerAccount)).amount) / 1_000_000;

  console.log(`Game Pool: ${gameBalanceBefore} tokens`);
  console.log(`Owner: ${ownerBalanceBefore} tokens`);
  console.log(`Total: ${gameBalanceBefore + ownerBalanceBefore} tokens\n`);

  // Mint 50 tokens with 80/20 logic (equivalent to 50 minutes of 1 token/minute)
  const totalTokensToMint = 50;
  const gameAmount = totalTokensToMint * 0.8; // 40 tokens
  const ownerAmount = totalTokensToMint * 0.2; // 10 tokens

  console.log('⚡ MINTING ADDITIONAL TOKENS:');
  console.log(`Total Mint: ${totalTokensToMint} tokens`);
  console.log(`Game Pool Gets: ${gameAmount} tokens (80%)`);
  console.log(`Owner Gets: ${ownerAmount} tokens (20%)\n`);

  try {
    // Mint to game pool (80%)
    console.log('🏦 Minting to Game Pool...');
    await mintTo(
      connection,
      payer,
      gameTokenMint,
      gamePoolAccount,
      payer,
      gameAmount * 1_000_000 // Convert to smallest unit
    );
    console.log(`✅ Minted ${gameAmount} tokens to Game Pool`);

    // Mint to owner (20%)
    console.log('👤 Minting to Owner...');
    await mintTo(
      connection,
      payer,
      gameTokenMint,
      ownerAccount,
      payer,
      ownerAmount * 1_000_000 // Convert to smallest unit
    );
    console.log(`✅ Minted ${ownerAmount} tokens to Owner`);

    console.log('\n💰 BALANCES AFTER MINTING:');
    const gameBalanceAfter = Number((await getAccount(connection, gamePoolAccount)).amount) / 1_000_000;
    const ownerBalanceAfter = Number((await getAccount(connection, ownerAccount)).amount) / 1_000_000;

    console.log(`Game Pool: ${gameBalanceAfter} tokens (+${gameAmount})`);
    console.log(`Owner: ${ownerBalanceAfter} tokens (+${ownerAmount})`);
    console.log(`Total: ${gameBalanceAfter + ownerBalanceAfter} tokens\n`);

    // Verify distribution
    const total = gameBalanceAfter + ownerBalanceAfter;
    const expectedGame = (gameBalanceBefore + gameAmount);
    const expectedOwner = (ownerBalanceBefore + ownerAmount);

    console.log('🔍 VERIFICATION:');
    console.log(`Expected Game: ${expectedGame.toFixed(1)} tokens`);
    console.log(`Actual Game: ${gameBalanceAfter} tokens`);
    console.log(`Expected Owner: ${expectedOwner.toFixed(1)} tokens`);
    console.log(`Actual Owner: ${ownerBalanceAfter} tokens`);

    const distributionCorrect = Math.abs(gameBalanceAfter - expectedGame) < 0.1 &&
                               Math.abs(ownerBalanceAfter - expectedOwner) < 0.1;

    console.log(`\n${distributionCorrect ? '✅' : '❌'} MINTING SUCCESSFUL: ${distributionCorrect ? '80/20 DISTRIBUTION CORRECT' : 'DISTRIBUTION ERROR'}`);

    if (distributionCorrect) {
      console.log('\n🎯 NOW CHECK YOUR WALLETS ON DEVNET EXPLORER:');
      console.log(`Owner Wallet: https://explorer.solana.com/address/${ownerAccount.toString()}?cluster=devnet`);
      console.log(`Game Pool: https://explorer.solana.com/address/${gamePoolAccount.toString()}?cluster=devnet`);
      console.log('\n💡 You should see:');
      console.log(`• Owner Wallet: ${ownerBalanceAfter} tokens (increased by ${ownerAmount})`);
      console.log(`• Game Pool: ${gameBalanceAfter} tokens (increased by ${gameAmount})`);
    }

  } catch (error) {
    console.error('❌ Minting failed:', error.message);
  }
}

if (require.main === module) {
  mintAdditionalTokens().catch(console.error);
}
