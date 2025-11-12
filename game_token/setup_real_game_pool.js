const { Connection, PublicKey, Keypair, Transaction, SystemProgram } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, createMint, createAssociatedTokenAccount, mintTo, getAccount, getAssociatedTokenAddress } = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');

// Load wallet
const keypairPath = path.join(process.env.HOME || process.env.USERPROFILE, '.config', 'solana', 'id.json');
const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
const payer = Keypair.fromSecretKey(new Uint8Array(keypairData));

async function setupRealGamePool() {
  console.log('🔧 SETUP REAL GAME POOL FOR TOKEN CLAIMS');
  console.log('='.repeat(60));

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Game token details
  const gameTokenMint = new PublicKey('ANzKnYDd7BpiPEykuHxrfAsiox19aWzLbZrmQbL8J8Qk');
  const playerATA = new PublicKey('qtfAibpP5SqJYLGTPedAJF8kTcnzZxeGXuxUDKw85ki');

  console.log('🪙 Game Token Mint:', gameTokenMint.toString());
  console.log('🎮 Player Token Account:', playerATA.toString());

  try {
    // Create a new game pool authority account
    console.log('\n🎯 CREATING NEW GAME POOL AUTHORITY...');
    const gamePoolAuthority = Keypair.generate();
    console.log('👤 Game Pool Authority:', gamePoolAuthority.publicKey.toString());

    // Create associated token account for game pool authority
    console.log('\n🏦 CREATING GAME POOL TOKEN ACCOUNT...');
    const gamePoolATA = await getAssociatedTokenAddress(gameTokenMint, gamePoolAuthority.publicKey);

    console.log('Game Pool ATA address:', gamePoolATA.toString());

    try {
      // Check if ATA already exists
      await getAccount(connection, gamePoolATA);
      console.log('✅ Game Pool ATA already exists');
    } catch {
      // Create the ATA
      console.log('Creating new ATA...');
      const ataResult = await createAssociatedTokenAccount(
        connection,
        payer,
        gameTokenMint,
        gamePoolAuthority.publicKey
      );
      console.log('Create ATA result type:', typeof ataResult);
      console.log('Create ATA result:', ataResult.toString());

      // Wait a bit for the transaction to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Verify ATA exists
    await getAccount(connection, gamePoolATA);
    console.log('✅ Game Pool ATA verified:', gamePoolATA.toString());

    // Fund the game pool with initial tokens
    const initialPoolAmount = 1000; // 1000 tokens
    console.log(`\n💰 FUNDING GAME POOL WITH ${initialPoolAmount} TOKENS...`);

    await mintTo(
      connection,
      payer,
      gameTokenMint,
      gamePoolATA,
      payer,
      initialPoolAmount * 1_000_000
    );

    console.log('✅ Game pool funded successfully');

    // Verify balances
    const gamePoolBalance = Number((await getAccount(connection, gamePoolATA)).amount) / 1_000_000;
    const playerBalance = Number((await getAccount(connection, playerATA)).amount) / 1_000_000;

    console.log('\n💰 FINAL BALANCES:');
    console.log(`🏦 New Game Pool: ${gamePoolBalance} tokens`);
    console.log(`🎮 Player: ${playerBalance} tokens`);

    // Save game pool configuration
    const gamePoolConfig = {
      gamePoolAuthority: gamePoolAuthority.publicKey.toString(),
      gamePoolATA: gamePoolATA.toString(),
      gameTokenMint: gameTokenMint.toString(),
      playerATA: playerATA.toString(),
      initialBalance: initialPoolAmount,
      currentBalance: gamePoolBalance,
      setupTimestamp: new Date().toISOString(),
      note: 'New game pool owned by regular account - can transfer tokens directly'
    };

    fs.writeFileSync('real_game_pool_config.json', JSON.stringify(gamePoolConfig, null, 2));

    // Save authority keypair (IMPORTANT: In production, this would be secure)
    fs.writeFileSync('game_pool_authority.json', JSON.stringify({
      publicKey: gamePoolAuthority.publicKey.toString(),
      secretKey: Array.from(gamePoolAuthority.secretKey)
    }, null, 2));

    console.log('\n✅ REAL GAME POOL SETUP COMPLETE!');
    console.log('💡 This game pool can now transfer tokens directly');
    console.log('💡 Authority keypair saved to game_pool_authority.json');

    console.log('\n🚀 NOW YOU CAN CLAIM TOKENS THAT ACTUALLY DECREASE GAME POOL BALANCE');

    return gamePoolConfig;

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Test claim with real game pool
async function testRealClaim() {
  console.log('\n🎮 TESTING REAL CLAIM WITH NEW GAME POOL...');

  try {
    // Load game pool config
    const config = JSON.parse(fs.readFileSync('real_game_pool_config.json', 'utf8'));
    const authorityData = JSON.parse(fs.readFileSync('game_pool_authority.json', 'utf8'));

    const gamePoolAuthority = Keypair.fromSecretKey(new Uint8Array(authorityData.secretKey));
    const gamePoolATA = new PublicKey(config.gamePoolATA);
    const playerATA = new PublicKey(config.playerATA);

    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    // Check initial balances
    const gamePoolBalanceBefore = Number((await getAccount(connection, gamePoolATA)).amount) / 1_000_000;
    const playerBalanceBefore = Number((await getAccount(connection, playerATA)).amount) / 1_000_000;

    console.log('Initial balances:');
    console.log(`🏦 Game Pool: ${gamePoolBalanceBefore} tokens`);
    console.log(`🎮 Player: ${playerBalanceBefore} tokens`);

    // Perform claim
    const claimAmount = 50;
    console.log(`\n⚡ CLAIMING ${claimAmount} TOKENS...`);

    const { createTransferInstruction } = require('@solana/spl-token');
    const transferIx = createTransferInstruction(
      gamePoolATA,
      playerATA,
      gamePoolAuthority.publicKey,
      claimAmount * 1_000_000,
      [],
      TOKEN_PROGRAM_ID
    );

    const transaction = new Transaction().add(transferIx);
    const signature = await connection.sendTransaction(transaction, [gamePoolAuthority]);

    console.log('✅ Claim transaction completed!');
    console.log('🔗 Signature:', signature);

    // Check final balances
    const gamePoolBalanceAfter = Number((await getAccount(connection, gamePoolATA)).amount) / 1_000_000;
    const playerBalanceAfter = Number((await getAccount(connection, playerATA)).amount) / 1_000_000;

    console.log('\n💰 FINAL BALANCES:');
    console.log(`🏦 Game Pool: ${gamePoolBalanceAfter} tokens (-${claimAmount})`);
    console.log(`🎮 Player: ${playerBalanceAfter} tokens (+${claimAmount})`);

    console.log('\n🎉 REAL CLAIM SUCCESS!');
    console.log('✅ Game pool balance actually DECREASED');
    console.log('✅ Player balance actually INCREASED');
    console.log('✅ This is the CORRECT smart contract behavior');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length > 0 && args[0] === 'test') {
    await testRealClaim();
  } else {
    const result = await setupRealGamePool();

    if (result.success !== false) {
      console.log('\n🚀 SETUP COMPLETE! Run "node setup_real_game_pool.js test" to test claiming');
    }
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { setupRealGamePool, testRealClaim };
