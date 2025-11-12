const anchor = require('@coral-xyz/anchor');
const { Connection, PublicKey, Keypair, SystemProgram } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, createMint, createAssociatedTokenAccount, mintTo, getAccount, getMint, getAssociatedTokenAddress } = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');

async function deployV2Contract() {
  console.log('🚀 DEPLOYING GAME TOKEN CONTRACT V2');
  console.log('='.repeat(60));

  // Connect to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Load wallet
  const keypairPath = path.join(process.env.HOME || process.env.USERPROFILE, '.config', 'solana', 'id.json');
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const payer = Keypair.fromSecretKey(new Uint8Array(keypairData));
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(payer), {
    commitment: 'confirmed'
  });
  anchor.setProvider(provider);

  console.log('💰 Payer:', payer.publicKey.toString());

  // Load V2 program
  const programId = new PublicKey('Do9Bq3c7rSSU4YW32F3mCZekQZo5jdyaBuayqmNGAeTf');
  const idl = JSON.parse(fs.readFileSync('./target/idl/game_token_v2.json', 'utf8'));
  const program = new anchor.Program(idl, programId, provider);

  console.log('📋 Program ID:', programId.toString());

  // Calculate V2 PDAs
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

  console.log('🎯 V2 PDA Addresses:');
  console.log('   Minting Authority:', mintingAuthority.toString());
  console.log('   Game Pools PDA:', gamePools.toString());
  console.log('   Token Account:', gamePoolsTokenAccount.toString());

  // Game Token Mint (same as V1)
  const gameTokenMint = new PublicKey('2AxM2y84vg5rwP7QK7mwmBBZrDnZpXZxKTwU5vvX1FWK');
  console.log('🪙 Game Token Mint:', gameTokenMint.toString());

  try {
    // Step 1: Initialize Game Pools PDA
    console.log('\n1️⃣ INITIALIZING GAME POOLS PDA V2...');
    const bump = (PublicKey.findProgramAddressSync([Buffer.from("game_pools_v2")], programId))[1];

    const tx1 = await program.methods
      .initializeGamePools(bump)
      .accounts({
        gamePools: gamePools,
        gameTokenMint: gameTokenMint,
        authority: payer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('✅ Game Pools PDA initialized:', tx1);

    // Step 2: Initialize Minting Authority
    console.log('\n2️⃣ INITIALIZING MINTING AUTHORITY V2...');
    const authorityBump = (PublicKey.findProgramAddressSync([Buffer.from("minting_authority")], programId))[1];

    const tx2 = await program.methods
      .initializeMintingAuthority(10, false, 1000000) // 10 per minute, no infinite, 1M max supply
      .accounts({
        authority: mintingAuthority,
        owner: payer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log('✅ Minting Authority initialized:', tx2);

    // Step 3: Create Game Pools Token Account
    console.log('\n3️⃣ CREATING GAME POOLS TOKEN ACCOUNT V2...');
    const createTokenAccountIx = await program.methods
      .createGamePoolsTokenAccount()
      .accounts({
        gamePoolsTokenAccount: gamePoolsTokenAccount,
        gamePools: gamePools,
        gameTokenMint: gameTokenMint,
        authority: payer.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    const tx3 = await program.rpc.createGamePoolsTokenAccount({
      accounts: {
        gamePoolsTokenAccount: gamePoolsTokenAccount,
        gamePools: gamePools,
        gameTokenMint: gameTokenMint,
        authority: payer.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      }
    });

    console.log('✅ Game Pools Token Account created:', tx3);

    // Save deployment info
    const deploymentInfo = {
      network: 'devnet',
      programId: programId.toString(),
      gameTokenMint: gameTokenMint.toString(),
      gamePoolAccount: gamePools.toString(),
      ownerAccount: '5BzeVCppuFzyLs5aM1f3n8BatqoUCx9hg5N7288zRSCN',
      mintingAuthority: mintingAuthority.toString(),
      gamePoolsTokenAccount: gamePoolsTokenAccount.toString(),
      deploymentTime: new Date().toISOString(),
      version: 'V2',
      notes: 'New game pool address with V2 seeds'
    };

    fs.writeFileSync('devnet_deployment_v2.json', JSON.stringify(deploymentInfo, null, 2));
    console.log('💾 Deployment info saved to devnet_deployment_v2.json');

    console.log('\n🎉 DEPLOYMENT V2 COMPLETE!');
    console.log('📊 Summary:');
    console.log('   - Program ID:', programId.toString());
    console.log('   - Game Pool PDA:', gamePools.toString());
    console.log('   - Token Account:', gamePoolsTokenAccount.toString());
    console.log('   - Ready for auto-mint testing!');

    return deploymentInfo;

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    throw error;
  }
}

// Run deployment
if (require.main === module) {
  deployV2Contract().catch(console.error);
}

module.exports = { deployV2Contract };




