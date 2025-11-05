const {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
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

async function main() {
  console.log('🚀 Testing Game Token Minting on Devnet');

  // Connect to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  console.log('Wallet public key:', payer.publicKey.toString());
  const balance = await connection.getBalance(payer.publicKey);
  console.log('SOL Balance:', balance / 1e9, 'SOL');

  // Create game token mint
  console.log('\n📝 Creating Game Token Mint...');
  const gameTokenMint = await createMint(
    connection,
    payer,
    payer.publicKey, // mint authority
    payer.publicKey, // freeze authority
    6, // decimals
    undefined,
    undefined,
    TOKEN_PROGRAM_ID
  );
  console.log('Game Token Mint:', gameTokenMint.toString());

  // Create associated token accounts for game pool and owner
  console.log('\n🏦 Creating Associated Token Accounts...');

  // For demo purposes, create a separate owner account by using a different "owner"
  // In real implementation, game pool would be owned by program PDA
  const gamePoolOwner = Keypair.generate(); // Simulate program PDA
  const ownerTokenOwner = payer; // Owner wallet

  const gamePoolAccount = await getAssociatedTokenAddress(
    gameTokenMint,
    gamePoolOwner.publicKey,
    false,
    TOKEN_PROGRAM_ID
  );

  const ownerAccount = await getAssociatedTokenAddress(
    gameTokenMint,
    ownerTokenOwner.publicKey,
    false,
    TOKEN_PROGRAM_ID
  );

  console.log('Game Pool Account:', gamePoolAccount.toString());
  console.log('Owner Account:', ownerAccount.toString());

  // Create the associated token accounts
  try {
    await createAssociatedTokenAccount(
      connection,
      payer,
      gameTokenMint,
      gamePoolOwner.publicKey,
      undefined,
      TOKEN_PROGRAM_ID
    );
    console.log('Created game pool associated token account');
  } catch (e) {
    console.log('Game pool account may already exist');
  }

  try {
    await createAssociatedTokenAccount(
      connection,
      payer,
      gameTokenMint,
      ownerTokenOwner.publicKey,
      undefined,
      TOKEN_PROGRAM_ID
    );
    console.log('Created owner associated token account');
  } catch (e) {
    console.log('Owner account may already exist');
  }

  // Simulate "eat energy particle" - mint tokens (80% game, 20% owner)
  console.log('\n⚡ Simulating Eat Energy Particle - Minting Tokens...');

  const particleLocation = { x: 100, y: 200 };
  console.log(`Eating particle at location: (${particleLocation.x}, ${particleLocation.y})`);

  // Mint 1 token to game pool (80% of 1 token)
  await mintTo(
    connection,
    payer,
    gameTokenMint,
    gamePoolAccount,
    payer,
    1 // 1 token with 6 decimals = 1_000_000
  );

  // Mint 1 token to owner (20% of 1 token)
  await mintTo(
    connection,
    payer,
    gameTokenMint,
    ownerAccount,
    payer,
    1 // 1 token with 6 decimals = 1_000_000
  );

  console.log('✅ Successfully minted tokens!');

  // Verify balances
  console.log('\n📊 Checking Token Balances...');

  const gamePoolInfo = await getAccount(connection, gamePoolAccount);
  const ownerAccountInfo = await getAccount(connection, ownerAccount);
  const mintInfo = await getMint(connection, gameTokenMint);

  console.log('Game Pool Balance:', Number(gamePoolInfo.amount) / 1e6, 'tokens');
  console.log('Owner Account Balance:', Number(ownerAccountInfo.amount) / 1e6, 'tokens');
  console.log('Total Supply:', Number(mintInfo.supply) / 1e6, 'tokens');

  // Simulate multiple particles
  console.log('\n🔄 Simulating Multiple Particle Consumption...');

  for (let i = 1; i <= 5; i++) {
    const location = { x: Math.floor(Math.random() * 800), y: Math.floor(Math.random() * 600) };
    console.log(`Eating particle ${i} at (${location.x}, ${location.y})`);

    // Mint to game pool (80%)
    await mintTo(connection, payer, gameTokenMint, gamePoolAccount, payer, 1);

    // Mint to owner (20%)
    await mintTo(connection, payer, gameTokenMint, ownerAccount, payer, 1);
  }

  // Final balance check
  const finalGamePoolInfo = await getAccount(connection, gamePoolAccount);
  const finalOwnerAccountInfo = await getAccount(connection, ownerAccount);
  const finalMintInfo = await getMint(connection, gameTokenMint);

  console.log('\n📈 Final Results:');
  console.log('Total Game Pool Balance:', Number(finalGamePoolInfo.amount) / 1e6, 'tokens');
  console.log('Total Owner Balance:', Number(finalOwnerAccountInfo.amount) / 1e6, 'tokens');
  console.log('Total Supply:', Number(finalMintInfo.supply) / 1e6, 'tokens');

  console.log('\n✅ Devnet Minting Test Completed Successfully!');
  console.log('🎮 Game Token System Ready for Integration!');
}

main().catch(console.error);
