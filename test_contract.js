const anchor = require('@project-serum/anchor');
const { PublicKey, SystemProgram } = require('@solana/web3.js');
const fs = require('fs');

async function testContract() {
  console.log('🚀 TESTING SMART CONTRACT FUNCTIONS\\n');

  // Setup connection
  const connection = new anchor.web3.Connection(
    anchor.web3.clusterApiUrl('devnet'),
    'confirmed'
  );

  // Load wallet
  const walletKeypair = anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync('~/.config/solana/id.json')))
  );
  const wallet = new anchor.Wallet(walletKeypair);

  // Setup provider
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: 'confirmed'
  });
  anchor.setProvider(provider);

  // Load program
  const programId = new PublicKey('YOUR_PROGRAM_ID_HERE'); // Replace with actual program ID
  const idl = JSON.parse(fs.readFileSync('./target/idl/game_token.json'));
  const program = new anchor.Program(idl, programId, provider);

  console.log('✅ Connected to program:', programId.toString());

  try {
    // Test 1: Initialize game pools
    console.log('\\n📋 Test 1: Initialize Game Pools');
    const gamePoolsKeypair = anchor.web3.Keypair.generate();
    const gameTokenMint = anchor.web3.Keypair.generate();

    await program.methods
      .initializeGamePools(new anchor.BN(0)) // bump
      .accounts({
        gamePools: gamePoolsKeypair.publicKey,
        gameTokenMint: gameTokenMint.publicKey,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([gamePoolsKeypair, gameTokenMint])
      .rpc();

    console.log('✅ Game pools initialized');

    // Test 2: Check game pools state
    console.log('\\n📋 Test 2: Check Game Pools State');
    const gamePoolsAccount = await program.account.gamePools.fetch(gamePoolsKeypair.publicKey);
    console.log('Game pools state:', {
      authority: gamePoolsAccount.authority.toString(),
      activePool: gamePoolsAccount.activePool.toString(),
      rewardPool: gamePoolsAccount.rewardPool.toString(),
      reservePool: gamePoolsAccount.reservePool.toString(),
      burnPool: gamePoolsAccount.burnPool.toString(),
      gameTokenMint: gamePoolsAccount.gameTokenMint.toString(),
    });

    console.log('\\n🎉 ALL TESTS PASSED!');
    console.log('\\n📋 Contract is working correctly!');
    console.log('🔗 Explorer: https://explorer.solana.com/address/' + programId.toString() + '?cluster=devnet');

  } catch (error) {
    console.error('\\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests
testContract().catch(console.error);
