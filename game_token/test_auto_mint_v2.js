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
const keypairPath = path.join(process.env.HOME || process.env.USERPROFILE, '.config', 'solana', 'id.json');
const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
const payer = Keypair.fromSecretKey(new Uint8Array(keypairData));

async function testAutoMintV2() {
  console.log('🧪 TESTING AUTO-MINT WITH GAME POOL V2');
  console.log('='.repeat(60));

  // Connect to devnet and setup Anchor
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(payer), {
    commitment: 'confirmed'
  });
  anchor.setProvider(provider);

  // Load V2 program
  const programId = new PublicKey('Do9Bq3c7rSSU4YW32F3mCZekQZo5jdyaBuayqmNGAeTf');
  const idl = JSON.parse(fs.readFileSync('./target/idl/game_token_v2.json', 'utf8'));
  const program = new anchor.Program(idl, programId, provider);

  console.log('📋 Using V2 Program:', programId.toString());

  // V2 PDA addresses
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

  console.log('🎯 V2 Addresses:');
  console.log('   Game Pool PDA:', gamePools.toString());
  console.log('   Token Account:', gamePoolsTokenAccount.toString());
  console.log('   Owner Account:', ownerAccount.toString());
  console.log();

  try {
    // Check current balances
    console.log('💰 Current Balances:');
    const gameBalanceBefore = Number((await getAccount(connection, gamePoolsTokenAccount)).amount) / 1_000_000;
    const ownerBalanceBefore = Number((await getAccount(connection, ownerAccount)).amount) / 1_000_000;

    console.log(`Game Pool: ${gameBalanceBefore} tokens`);
    console.log(`Owner: ${ownerBalanceBefore} tokens`);
    console.log(`Total: ${gameBalanceBefore + ownerBalanceBefore} tokens`);
    console.log();

    // Test auto-mint with 100 tokens
    console.log('⚡ EXECUTING AUTO-MINT V2 - 100 tokens');

    const tx = await program.methods
      .autoMintTokens(new anchor.BN(100))
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

    console.log('✅ Auto-mint transaction:', tx);

    // Check balances after
    console.log('\n💰 Balances After Auto-Mint:');
    const gameBalanceAfter = Number((await getAccount(connection, gamePoolsTokenAccount)).amount) / 1_000_000;
    const ownerBalanceAfter = Number((await getAccount(connection, ownerAccount)).amount) / 1_000_000;

    console.log(`Game Pool: ${gameBalanceAfter} tokens (+${gameBalanceAfter - gameBalanceBefore})`);
    console.log(`Owner: ${ownerBalanceAfter} tokens (+${ownerBalanceAfter - ownerBalanceBefore})`);
    console.log(`Total: ${gameBalanceAfter + ownerBalanceAfter} tokens`);

    // Verify distribution
    const expectedGame = gameBalanceBefore + 80; // 80% of 100
    const expectedOwner = ownerBalanceBefore + 20; // 20% of 100

    console.log('\n🔍 Distribution Verification:');
    console.log(`Expected Game: ${expectedGame.toFixed(1)} tokens`);
    console.log(`Actual Game: ${gameBalanceAfter} tokens`);
    console.log(`Expected Owner: ${expectedOwner.toFixed(1)} tokens`);
    console.log(`Actual Owner: ${ownerBalanceAfter} tokens`);

    const success = Math.abs(gameBalanceAfter - expectedGame) < 0.1 &&
                   Math.abs(ownerBalanceAfter - expectedOwner) < 0.1;

    console.log(`\n${success ? '✅' : '❌'} TEST RESULT: ${success ? 'AUTO-MINT V2 WORKING!' : 'DISTRIBUTION ERROR'}`);

    return {
      success,
      minted: 100,
      gameReceived: 80,
      ownerReceived: 20,
      transaction: tx,
      balancesBefore: { game: gameBalanceBefore, owner: ownerBalanceBefore },
      balancesAfter: { game: gameBalanceAfter, owner: ownerBalanceAfter }
    };

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run test
if (require.main === module) {
  testAutoMintV2().catch(console.error);
}

module.exports = { testAutoMintV2 };




