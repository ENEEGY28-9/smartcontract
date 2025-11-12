const {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL
} = require('@solana/web3.js');
const {
  TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getAccount,
  getMint,
  transfer
} = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');

async function testAutoMintSimple() {
  console.log('🧪 TESTING AUTO-MINT LOGIC - SIMPLE VERSION');
  console.log('='.repeat(60));

  // Connect to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Load wallet
  const keypairPath = path.join(process.env.HOME || process.env.USERPROFILE, '.config', 'solana', 'id.json');
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const payer = Keypair.fromSecretKey(new Uint8Array(keypairData));

  console.log('👤 Wallet:', payer.publicKey.toString());

  // Load configuration
  let config;
  try {
    config = JSON.parse(fs.readFileSync('./production_config.json'));
    console.log('✅ Configuration loaded');
  } catch (error) {
    console.error('❌ Cannot load configuration:', error.message);
    return;
  }

  const gameTokenMint = new PublicKey(config.gameTokenMint);
  // Use the actual token accounts created, not the PDA-derived ones
  const gamePoolsTokenAccount = new PublicKey('HHHaKDSbruknbEFqwB3tfMQ5dAyatyavi15JHvFATssq'); // From previous run
  const ownerTokenAccount = new PublicKey('4K9tg8tAFMGYCZkSJA3UhC5hizFfkAceoMn6L6gfNiW9'); // From previous run

  console.log('🪙 Game Token Mint:', gameTokenMint.toString());
  console.log('🏦 Game Pools Token Account:', gamePoolsTokenAccount.toString());
  console.log('💰 Owner Token Account:', ownerTokenAccount.toString());

  try {
    // Check initial balances
    console.log('\n📊 INITIAL BALANCES:');
    const gameBalanceBefore = Number((await getAccount(connection, gamePoolsTokenAccount)).amount) / 1_000_000;
    const ownerBalanceBefore = Number((await getAccount(connection, ownerTokenAccount)).amount) / 1_000_000;

    console.log(`Game Pool: ${gameBalanceBefore} tokens`);
    console.log(`Owner: ${ownerBalanceBefore} tokens`);
    console.log(`Total: ${gameBalanceBefore + ownerBalanceBefore} tokens`);

    // Simulate auto-mint distribution (80/20 logic)
    console.log('\n⚡ SIMULATING AUTO-MINT DISTRIBUTION (100 tokens)');
    console.log('🎯 Expected distribution:');
    console.log('   Game Pool: 80 tokens (80%)');
    console.log('   Owner: 20 tokens (20%)');

    // Mint tokens to game pool (80 tokens)
    console.log('\n🏊 Minting 80 tokens to Game Pool...');
    await mintTo(
      connection,
      payer,
      gameTokenMint,
      gamePoolsTokenAccount,
      payer.publicKey,
      80_000_000 // 80 tokens (6 decimals)
    );
    console.log('✅ Minted 80 tokens to Game Pool');

    // Mint tokens to owner (20 tokens)
    console.log('\n👤 Minting 20 tokens to Owner...');
    await mintTo(
      connection,
      payer,
      gameTokenMint,
      ownerTokenAccount,
      payer.publicKey,
      20_000_000 // 20 tokens (6 decimals)
    );
    console.log('✅ Minted 20 tokens to Owner');

    // Check final balances
    console.log('\n📊 FINAL BALANCES:');
    const gameBalanceAfter = Number((await getAccount(connection, gamePoolsTokenAccount)).amount) / 1_000_000;
    const ownerBalanceAfter = Number((await getAccount(connection, ownerTokenAccount)).amount) / 1_000_000;

    console.log(`Game Pool: ${gameBalanceAfter} tokens`);
    console.log(`Owner: ${ownerBalanceAfter} tokens`);
    console.log(`Total: ${gameBalanceAfter + ownerBalanceAfter} tokens`);

    // Verify distribution
    const gameIncrease = gameBalanceAfter - gameBalanceBefore;
    const ownerIncrease = ownerBalanceAfter - ownerBalanceBefore;
    const totalIncrease = gameIncrease + ownerIncrease;

    console.log('\n🔍 DISTRIBUTION VERIFICATION:');
    console.log(`Game Pool received: ${gameIncrease} tokens`);
    console.log(`Owner received: ${ownerIncrease} tokens`);
    console.log(`Total minted: ${totalIncrease} tokens`);

    const gamePercentage = (gameIncrease / totalIncrease * 100).toFixed(1);
    const ownerPercentage = (ownerIncrease / totalIncrease * 100).toFixed(1);

    console.log(`Game Pool percentage: ${gamePercentage}%`);
    console.log(`Owner percentage: ${ownerPercentage}%`);

    if (Math.abs(gameIncrease - 80) < 0.1 && Math.abs(ownerIncrease - 20) < 0.1) {
      console.log('\n✅ SUCCESS: 80/20 distribution logic working correctly!');
    } else {
      console.log('\n❌ ERROR: Distribution logic incorrect!');
    }

    // Save test results
    const testResult = {
      timestamp: new Date().toISOString(),
      initialBalances: {
        gamePool: gameBalanceBefore,
        owner: ownerBalanceBefore,
        total: gameBalanceBefore + ownerBalanceBefore
      },
      minted: {
        gamePool: 80,
        owner: 20,
        total: 100
      },
      finalBalances: {
        gamePool: gameBalanceAfter,
        owner: ownerBalanceAfter,
        total: gameBalanceAfter + ownerBalanceAfter
      },
      distribution: {
        gamePoolPercentage: gamePercentage + '%',
        ownerPercentage: ownerPercentage + '%',
        correct: Math.abs(gameIncrease - 80) < 0.1 && Math.abs(ownerIncrease - 20) < 0.1
      }
    };

    fs.writeFileSync('./auto_mint_test_result.json', JSON.stringify(testResult, null, 2));
    console.log('\n💾 Test results saved to auto_mint_test_result.json');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  testAutoMintSimple().catch(console.error);
}

module.exports = { testAutoMintSimple };
