// Auto-Mint Scheduler Simple - Direct SPL Token Minting
// Không cần smart contract, mint trực tiếp qua SPL Token API

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

// Configuration - Logic của bạn
const MINT_INTERVAL = 60 * 1000; // 1 minute in milliseconds
const TOKENS_PER_MINT = 100; // 100 tokens each interval

// Use the working addresses from devnet testing
const gameTokenMint = new PublicKey('2AxM2y84vg5rwP7QK7mwmBBZrDnZpXZxKTwU5vvX1FWK');
const gamePoolAccount = new PublicKey('BwnPAXJ7FSQQkirnXzvLsELk5crhLxbzArwtcfgrGp19');
const ownerAccount = new PublicKey('8unZYfU5Xm1DCgnSt12jjqwXP1ifcMUSbFFerbBN8WYS');

async function autoMintTokens() {
  console.log('🚀 AUTO-MINT SCHEDULER - Direct SPL Token Minting\n');

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  console.log('📍 Using Devnet Addresses:');
  console.log(`Game Token Mint: ${gameTokenMint.toString()}`);
  console.log(`Game Pool: ${gamePoolAccount.toString()}`);
  console.log(`Owner Wallet: ${ownerAccount.toString()}\n`);

  // Check balances before minting
  console.log('💰 BALANCES BEFORE AUTO-MINT:');
  const gameBalanceBefore = Number((await getAccount(connection, gamePoolAccount)).amount) / 1_000_000;
  const ownerBalanceBefore = Number((await getAccount(connection, ownerAccount)).amount) / 1_000_000;

  console.log(`Game Pool: ${gameBalanceBefore} tokens`);
  console.log(`Owner: ${ownerBalanceBefore} tokens`);
  console.log(`Total: ${gameBalanceBefore + ownerBalanceBefore} tokens\n`);

  // Calculate 80/20 distribution
  const gameAmount = TOKENS_PER_MINT * 0.8; // 80 tokens
  const ownerAmount = TOKENS_PER_MINT * 0.2; // 20 tokens

  console.log('⚡ MINTING 100 TOKENS WITH 80/20 LOGIC:');
  console.log(`Total Mint: ${TOKENS_PER_MINT} tokens`);
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

    console.log('\n💰 BALANCES AFTER AUTO-MINT:');
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

    console.log(`\n${distributionCorrect ? '✅' : '❌'} AUTO-MINT SUCCESSFUL: ${distributionCorrect ? '80/20 DISTRIBUTION CORRECT' : 'DISTRIBUTION ERROR'}`);

    console.log('\n🎯 NEXT AUTO-MINT IN 1 MINUTE...');
    console.log('💡 Check your wallets on devnet explorer for real-time updates!');

    return {
      success: distributionCorrect,
      minted: TOKENS_PER_MINT,
      gameReceived: gameAmount,
      ownerReceived: ownerAmount,
      balancesAfter: { game: gameBalanceAfter, owner: ownerBalanceAfter }
    };

  } catch (error) {
    console.error('❌ Auto-mint failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function startAutoMintScheduler() {
  console.log('⏰ STARTING AUTO-MINT SCHEDULER - DEVNET');
  console.log('📅 Minting every 1 minute (60 seconds)');
  console.log('🎯 Independent of player activity');
  console.log('💰 Owner gets 20 tokens per minute automatically');
  console.log('='.repeat(60));
  console.log();

  // Run initial mint immediately
  console.log('🚀 Running INITIAL auto-mint...');
  const result = await autoMintTokens();

  if (result.success) {
    console.log('✅ Initial mint successful\n');

    // Setup recurring mint every minute
    console.log('⏰ Setting up RECURRING mint schedule...');
    setInterval(async () => {
      console.log('\n⏰ AUTO-MINT INTERVAL TRIGGERED');
      console.log(new Date().toISOString());
      await autoMintTokens();
    }, MINT_INTERVAL);

    console.log('🎯 Auto-mint scheduler is now RUNNING!');
    console.log('💡 Owner will receive 20 tokens every minute');
    console.log('📊 Check balances on devnet explorer to see real-time updates');
    console.log('🔗 Game Pool: https://explorer.solana.com/address/BwnPAXJ7FSQQkirnXzvLsELk5crhLxbzArwtcfgrGp19?cluster=devnet');
    console.log('🔗 Owner: https://explorer.solana.com/address/8unZYfU5Xm1DCgnSt12jjqwXP1ifcMUSbFFerbBN8WYS?cluster=devnet');

  } else {
    console.error('❌ Initial mint failed, scheduler not started');
  }
}

// Run the scheduler
if (require.main === module) {
  startAutoMintScheduler().catch(console.error);
}

module.exports = { autoMintTokens, startAutoMintScheduler };
