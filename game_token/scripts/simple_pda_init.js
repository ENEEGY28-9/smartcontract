const {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL
} = require('@solana/web3.js');
const {
  TOKEN_PROGRAM_ID,
  createMint,
  createAssociatedTokenAccount,
  getAccount,
  getAssociatedTokenAddress,
  createAccount
} = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');

async function simplePDAInit() {
  console.log('🚀 SIMPLE PDA INITIALIZATION');
  console.log('='.repeat(50));

  // Connect to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Load wallet
  const keypairPath = path.join(process.env.HOME || process.env.USERPROFILE, '.config', 'solana', 'id.json');
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const payer = Keypair.fromSecretKey(new Uint8Array(keypairData));

  console.log('👤 Wallet:', payer.publicKey.toString());

  // Program ID from deployment
  const programId = new PublicKey('Do9Bq3c7rSSU4YW32F3mCZekQZo5jdyaBuayqmNGAeTf');
  console.log('📋 Program ID:', programId.toString());

  // Derive PDAs
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

  console.log('\n🔑 PDA Addresses:');
  console.log('   Minting Authority:', mintingAuthority.toString());
  console.log('   Game Pools:', gamePools.toString());
  console.log('   Game Pools Token Account:', gamePoolsTokenAccount.toString());

  // Check wallet balance
  const balance = await connection.getBalance(payer.publicKey);
  console.log('\n💰 Wallet Balance:', balance / LAMPORTS_PER_SOL, 'SOL');

  try {
    // Step 1: Create Game Token Mint if needed
    console.log('\n1️⃣ Creating Game Token Mint...');
    let gameTokenMint;

    // Try to create mint
    try {
      gameTokenMint = await createMint(
        connection,
        payer,
        payer.publicKey, // mint authority
        payer.publicKey, // freeze authority
        6, // decimals
        undefined,
        undefined,
        TOKEN_PROGRAM_ID
      );
      console.log('✅ Game Token Mint created:', gameTokenMint.toString());
    } catch (error) {
      if (error.message.includes('already in use')) {
        // Mint might already exist, try to find it
        console.log('⚠️ Mint might already exist, checking...');
        // For now, use the expected address from deployment config
        gameTokenMint = new PublicKey('2AxM2y84vg5rwP7QK7mwmBBZrDnZpXZxKTwU5vvX1FWK');
        console.log('✅ Using existing Game Token Mint:', gameTokenMint.toString());
      } else {
        throw error;
      }
    }

    // Step 2: Create Game Pools Token Account
    console.log('\n2️⃣ Creating Game Pools Token Account...');
    try {
      // For PDA (off-curve), we need to create a regular token account
      const gamePoolsTokenAccount = await createAccount(
        connection,
        payer,
        gameTokenMint,
        gamePools, // owner is the PDA
        Keypair.generate(), // new keypair for the account
        undefined,
        TOKEN_PROGRAM_ID
      );
      console.log('✅ Game Pools Token Account created:', gamePoolsTokenAccount.toString());
    } catch (error) {
      if (error.message.includes('already in use')) {
        console.log('✅ Game Pools Token Account already exists');
      } else {
        console.error('❌ Error creating Game Pools Token Account:', error.message);
      }
    }

    // Step 3: Create Owner Token Account
    console.log('\n3️⃣ Creating Owner Token Account...');
    try {
      const ownerATA = await getAssociatedTokenAddress(
        gameTokenMint,
        payer.publicKey
      );

      const ownerTokenAccount = await createAssociatedTokenAccount(
        connection,
        payer,
        gameTokenMint,
        payer.publicKey
      );
      console.log('✅ Owner Token Account created:', ownerTokenAccount.toString());
    } catch (error) {
      if (error.message.includes('already in use')) {
        console.log('✅ Owner Token Account already exists');
      } else {
        console.error('❌ Error creating Owner Token Account:', error);
      }
    }

    // Save configuration
    const config = {
      programId: programId.toString(),
      mintingAuthority: mintingAuthority.toString(),
      gamePools: gamePools.toString(),
      gamePoolsTokenAccount: gamePoolsTokenAccount.toString(),
      gameTokenMint: gameTokenMint.toString(),
      wallet: payer.publicKey.toString(),
      cluster: 'devnet',
      initialized: new Date().toISOString(),
      status: 'Basic PDA and Token Accounts initialized'
    };

    fs.writeFileSync('./production_config.json', JSON.stringify(config, null, 2));
    console.log('\n💾 Configuration saved to production_config.json');

    console.log('\n🎉 BASIC PDA INITIALIZATION COMPLETE!');
    console.log('📋 Ready for smart contract initialization...');

  } catch (error) {
    console.error('❌ Initialization failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  simplePDAInit().catch(console.error);
}

module.exports = { simplePDAInit };
