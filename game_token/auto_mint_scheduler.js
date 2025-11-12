// Auto-Mint Scheduler - Theo Logic Đúng Của Bạn
// Mint token định kỳ, KHÔNG phụ thuộc player activity
// Chia 80/20 ngay lập tức

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
const anchor = require('@coral-xyz/anchor');
const fs = require('fs');
const path = require('path');

// Load wallet keypair
const keypairPath = path.join(__dirname, '..', 'new_owner_private_key.json');
const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
const payer = Keypair.fromSecretKey(new Uint8Array(keypairData.privateKey));

// Configuration
const MINT_INTERVAL = 60 * 1000; // 1 minute in milliseconds (changed from 1 hour)
const TOKENS_PER_MINT = 100; // Tokens to mint each interval (increased to 100 tokens/minute)

async function autoMintTokens() {
  console.log('🚀 AUTO-MINT SCHEDULER - Logic Đúng Của Bạn\n');

  // Connect to devnet and setup Anchor
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(payer), {
    commitment: 'confirmed'
  });
  anchor.setProvider(provider);

  // Load deployed program V2
  const programId = new PublicKey('Do9Bq3c7rSSU4YW32F3mCZekQZo5jdyaBuayqmNGAeTf');
  const idl = JSON.parse(fs.readFileSync('./target/idl/game_token_v2.json', 'utf8'));
  const program = new anchor.Program(idl, programId, provider);

  // Use deployed addresses
  const gameTokenMint = new PublicKey('2AxM2y84vg5rwP7QK7mwmBBZrDnZpXZxKTwU5vvX1FWK');
  const ownerAccount = new PublicKey('5BzeVCppuFzyLs5aM1f3n8BatqoUCx9hg5N7288zRSCN');

  // Derive V2 PDAs
  const [mintingAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("minting_authority")],
    programId
  );
  const [gamePools] = PublicKey.findProgramAddressSync(
    [Buffer.from("game_pools_v2")],
    programId
  );
  const [gamePoolsTokenAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from("game_pools_v2_token_account")],
    programId
  );

  console.log('📅 Starting Auto-Mint Process...');
  console.log('⏰ Interval:', MINT_INTERVAL / 1000, 'seconds (1 minute)');
  console.log('💰 Tokens per mint:', TOKENS_PER_MINT);
  console.log('📍 Program ID:', programId.toString());
  console.log('🎯 Minting Authority:', mintingAuthority.toString());
  console.log('🏦 Game Pools:', gamePools.toString());
  console.log();

  try {
    // Check current balances
    console.log('💰 Current Balances Before Mint:');
    const gameBalanceBefore = Number((await getAccount(connection, gamePoolsTokenAccount)).amount) / 1_000_000;
    const ownerBalanceBefore = Number((await getAccount(connection, ownerAccount)).amount) / 1_000_000;

    console.log(`Game Pool: ${gameBalanceBefore} tokens`);
    console.log(`Owner: ${ownerBalanceBefore} tokens`);
    console.log(`Total: ${gameBalanceBefore + ownerBalanceBefore} tokens`);
    console.log();

    // LOGIC ĐÚNG CỦA BẠN: Auto-mint theo schedule, KHÔNG phụ thuộc player
    console.log('⚡ EXECUTING AUTO-MINT VIA SMART CONTRACT - Independent of Player Activity');

    // Calculate 80/20 distribution
    const gameAmount = TOKENS_PER_MINT * 0.8; // 80 tokens (80% of 100)
    const ownerAmount = TOKENS_PER_MINT * 0.2; // 20 tokens (20% of 100)

    console.log(`Total Mint: ${TOKENS_PER_MINT} tokens`);
    console.log(`Game Pool Gets: ${gameAmount} tokens (80%)`);
    console.log(`Owner Gets: ${ownerAmount} tokens (20%)`);
    console.log('🎯 This happens AUTOMATICALLY - No players needed!');
    console.log();

    // Call smart contract auto_mint_tokens
    console.log('🚀 Calling auto_mint_tokens smart contract function...');
    const tx = await program.methods
      .autoMintTokens(new anchor.BN(TOKENS_PER_MINT))
      .accounts({
        authority: mintingAuthority,
        gamePools: gamePools,
        gamePoolsTokenAccount: gamePoolsTokenAccount,
        ownerTokenAccount: ownerAccount,
        gameTokenMint: gameTokenMint,
        owner: payer.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      })
      .rpc();

    console.log('✅ Smart contract transaction:', tx);
    console.log(`✅ Auto-minted ${TOKENS_PER_MINT} tokens via smart contract`);
    console.log(`✅ Game Pool: +${gameAmount} tokens (80%)`);
    console.log(`✅ Owner: +${ownerAmount} tokens (20%)`);

    // Check balances after mint
    console.log('\n💰 Balances After Auto-Mint:');
    const gameBalanceAfter = Number((await getAccount(connection, gamePoolsTokenAccount)).amount) / 1_000_000;
    const ownerBalanceAfter = Number((await getAccount(connection, ownerAccount)).amount) / 1_000_000;

    console.log(`Game Pool: ${gameBalanceAfter} tokens (+${gameAmount})`);
    console.log(`Owner: ${ownerBalanceAfter} tokens (+${ownerAmount})`);
    console.log(`Total: ${gameBalanceAfter + ownerBalanceAfter} tokens`);

    // Verify distribution
    const totalTokens = gameBalanceAfter + ownerBalanceAfter;
    const expectedGame = (gameBalanceBefore + gameAmount);
    const expectedOwner = (ownerBalanceBefore + ownerAmount);

    console.log('\n🔍 Distribution Verification:');
    console.log(`Expected Game: ${expectedGame.toFixed(1)} tokens`);
    console.log(`Actual Game: ${gameBalanceAfter} tokens`);
    console.log(`Expected Owner: ${expectedOwner.toFixed(1)} tokens`);
    console.log(`Actual Owner: ${ownerBalanceAfter} tokens`);

    const distributionCorrect = Math.abs(gameBalanceAfter - expectedGame) < 0.1 &&
                               Math.abs(ownerBalanceAfter - expectedOwner) < 0.1;

    console.log(`\n${distributionCorrect ? '✅' : '❌'} AUTO-MINT SUCCESSFUL: ${distributionCorrect ? '80/20 DISTRIBUTION CORRECT' : 'DISTRIBUTION ERROR'}`);

    // Owner revenue impact
    console.log('\n💎 OWNER REVENUE IMPACT:');
    console.log(`Owner received: ${ownerAmount} tokens immediately`);
    console.log(`Revenue source: Smart contract auto-mint (not player activity)`);
    console.log(`Transaction: ${tx}`);
    console.log(`Next mint: In ${MINT_INTERVAL / 1000} seconds (1 minute)`);
    console.log('🎯 ADVANTAGE: High-frequency predictable revenue stream!');

    return {
      success: distributionCorrect,
      minted: TOKENS_PER_MINT,
      gameReceived: gameAmount,
      ownerReceived: ownerAmount,
      transaction: tx,
      balancesBefore: { game: gameBalanceBefore, owner: ownerBalanceBefore },
      balancesAfter: { game: gameBalanceAfter, owner: ownerBalanceAfter }
    };

  } catch (error) {
    console.error('❌ Auto-mint failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Function to run scheduled minting
async function startScheduledMinting() {
  console.log('⏰ Starting Scheduled Auto-Mint System');
  console.log('📅 Minting every', MINT_INTERVAL / 1000, 'seconds (1 minute)');
  console.log('🎯 Independent of player activity');
  console.log('💰 Owner gets 20 tokens immediately per minute\n');

  // Run initial mint
  console.log('🚀 Running initial auto-mint...');
  const result = await autoMintTokens();

  if (result.success) {
    console.log('✅ Initial mint successful\n');

    // Setup recurring schedule (in production, use cron job)
    console.log('⏰ Setting up recurring mint schedule...');
    setInterval(async () => {
      console.log('\n⏰ AUTO-MINT INTERVAL TRIGGERED');
      await autoMintTokens();
    }, MINT_INTERVAL);

    console.log('🎯 Auto-mint scheduler is now RUNNING!');
    console.log('💡 Owner will receive 20% every interval, regardless of players');
  } else {
    console.error('❌ Initial mint failed, scheduler not started');
  }
}

// Run the scheduler
if (require.main === module) {
  startScheduledMinting().catch(console.error);
}

module.exports = { autoMintTokens, startScheduledMinting };

