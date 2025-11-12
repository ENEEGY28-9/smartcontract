const { Connection, PublicKey, Keypair, SystemProgram } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, createMint, createAssociatedTokenAccount, getAccount, getAssociatedTokenAddress } = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');

async function simpleDeployV2() {
  console.log('🚀 SIMPLE DEPLOY GAME TOKEN V2');
  console.log('='.repeat(60));

  // Connect to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Load wallet
  const keypairPath = path.join(process.env.HOME || process.env.USERPROFILE, '.config', 'solana', 'id.json');
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const payer = Keypair.fromSecretKey(new Uint8Array(keypairData));

  console.log('💰 Payer:', payer.publicKey.toString());

  // V2 addresses
  const programId = new PublicKey('Do9Bq3c7rSSU4YW32F3mCZekQZo5jdyaBuayqmNGAeTf');
  const gameTokenMint = new PublicKey('2AxM2y84vg5rwP7QK7mwmBBZrDnZpXZxKTwU5vvX1FWK');
  const ownerWallet = new PublicKey('5BzeVCppuFzyLs5aM1f3n8BatqoUCx9hg5N7288zRSCN');

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

  console.log('🎯 V2 PDAs:');
  console.log('   Minting Authority:', mintingAuthority.toString());
  console.log('   Game Pools PDA:', gamePools.toString());
  console.log('   Token Account:', gamePoolsTokenAccount.toString());
  console.log('   Owner Wallet:', ownerWallet.toString());
  console.log();

  try {
    // Step 1: Create owner token account if needed
    console.log('1️⃣ CREATING OWNER TOKEN ACCOUNT...');
    let ownerTokenAccount;
    try {
      ownerTokenAccount = await getAssociatedTokenAddress(gameTokenMint, ownerWallet);
      await getAccount(connection, ownerTokenAccount);
      console.log('✅ Owner token account already exists');
    } catch {
      console.log('Creating owner token account...');
      const tx1 = await createAssociatedTokenAccount(
        connection,
        payer,
        gameTokenMint,
        ownerWallet
      );
      console.log('✅ Owner token account created:', tx1.toString());
      ownerTokenAccount = await getAssociatedTokenAddress(gameTokenMint, ownerWallet);
    }

    // Step 2: Fund game pools token account (simulate initialization)
    console.log('\n2️⃣ SIMULATING GAME POOL INITIALIZATION...');
    console.log('💡 In real deployment, this would be done by smart contract');
    console.log('💡 For now, we manually create the associated token account');

    let gamePoolTokenAccount;
    try {
      gamePoolTokenAccount = await getAssociatedTokenAddress(gameTokenMint, gamePools);
      await getAccount(connection, gamePoolTokenAccount);
      console.log('✅ Game pool token account already exists');
    } catch {
      console.log('Creating game pool token account...');
      const tx2 = await createAssociatedTokenAccount(
        connection,
        payer,
        gameTokenMint,
        gamePools
      );
      console.log('✅ Game pool token account created:', tx2.toString());
      gamePoolTokenAccount = await getAssociatedTokenAddress(gameTokenMint, gamePools);
    }

    // Step 3: Verify setup
    console.log('\n3️⃣ VERIFYING SETUP...');
    const gamePoolBalance = await getAccount(connection, gamePoolTokenAccount);
    const ownerBalance = await getAccount(connection, ownerTokenAccount);

    console.log(`🏦 Game Pool Balance: ${Number(gamePoolBalance.amount) / 1_000_000} tokens`);
    console.log(`👤 Owner Balance: ${Number(ownerBalance.amount) / 1_000_000} tokens`);

    // Save deployment info
    const deploymentInfo = {
      network: 'devnet',
      programId: programId.toString(),
      gameTokenMint: gameTokenMint.toString(),
      gamePoolAccount: gamePools.toString(),
      ownerAccount: ownerWallet.toString(),
      mintingAuthority: mintingAuthority.toString(),
      gamePoolsTokenAccount: gamePoolTokenAccount.toString(),
      ownerTokenAccount: ownerTokenAccount.toString(),
      deploymentTime: new Date().toISOString(),
      version: 'V2-Simple',
      notes: 'Simple deployment without smart contract, manual PDA initialization'
    };

    fs.writeFileSync('simple_deployment_v2.json', JSON.stringify(deploymentInfo, null, 2));
    console.log('💾 Deployment info saved to simple_deployment_v2.json');

    console.log('\n🎉 SIMPLE DEPLOYMENT COMPLETE!');
    console.log('📊 Summary:');
    console.log('   - Game Pool PDA:', gamePools.toString());
    console.log('   - Token Account:', gamePoolTokenAccount.toString());
    console.log('   - Owner Token Account:', ownerTokenAccount.toString());
    console.log('   - Ready for testing!');

    console.log('\n🔗 Explorer Links:');
    console.log('   Game Pool Token Account:', `https://explorer.solana.com/address/${gamePoolTokenAccount.toString()}?cluster=devnet`);
    console.log('   Owner Token Account:', `https://explorer.solana.com/address/${ownerTokenAccount.toString()}?cluster=devnet`);

    return deploymentInfo;

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    throw error;
  }
}

// Run deployment
if (require.main === module) {
  simpleDeployV2().catch(console.error);
}

module.exports = { simpleDeployV2 };




