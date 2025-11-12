const {
  Connection,
  PublicKey,
  Keypair
} = require('@solana/web3.js');
const {
  TOKEN_PROGRAM_ID,
  mintTo,
  getAccount
} = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');

async function verifyTokenRate() {
  console.log('⏱️ VERIFYING TOKEN PRODUCTION RATE (100 tokens/minute)');
  console.log('='.repeat(70));

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
  const gamePoolsTokenAccount = new PublicKey('HHHaKDSbruknbEFqwB3tfMQ5dAyatyavi15JHvFATssq');
  const ownerTokenAccount = new PublicKey('4K9tg8tAFMGYCZkSJA3UhC5hizFfkAceoMn6L6gfNiW9');

  console.log('🪙 Game Token Mint:', gameTokenMint.toString());

  // Test parameters
  const targetTokensPerMinute = 100;
  const testDurationSeconds = 30; // Test for 30 seconds for demo
  const cyclesPerMinute = 6; // 6 cycles per minute (every 10 seconds)
  const tokensPerCycle = targetTokensPerMinute / cyclesPerMinute; // ~16.67 tokens per cycle

  console.log(`\n🎯 TARGET: ${targetTokensPerMinute} tokens/minute`);
  console.log(`⏱️ Test Duration: ${testDurationSeconds} seconds`);
  console.log(`🔄 Cycles per minute: ${cyclesPerMinute}`);
  console.log(`💰 Tokens per cycle: ${tokensPerCycle.toFixed(2)}`);

  try {
    // Get initial balances
    const initialGameBalance = Number((await getAccount(connection, gamePoolsTokenAccount)).amount) / 1_000_000;
    const initialOwnerBalance = Number((await getAccount(connection, ownerTokenAccount)).amount) / 1_000_000;

    console.log('\n📊 INITIAL BALANCES:');
    console.log(`Game Pool: ${initialGameBalance} tokens`);
    console.log(`Owner: ${initialOwnerBalance} tokens`);
    console.log(`Total: ${initialGameBalance + initialOwnerBalance} tokens`);

    // Start production test
    console.log('\n🚀 STARTING TOKEN PRODUCTION TEST...');

    const startTime = Date.now();
    let totalCycles = 0;
    let totalTokensMinted = 0;

    // Test for the specified duration
    const testEndTime = startTime + (testDurationSeconds * 1000);

    while (Date.now() < testEndTime) {
      const cycleStartTime = Date.now();

      // Mint tokens according to 80/20 distribution
      const gameTokens = Math.floor(tokensPerCycle * 0.8); // 80% to game pool
      const ownerTokens = Math.floor(tokensPerCycle * 0.2); // 20% to owner

      // Mint to game pool
      await mintTo(
        connection,
        payer,
        gameTokenMint,
        gamePoolsTokenAccount,
        payer.publicKey,
        gameTokens * 1_000_000 // Convert to smallest unit
      );

      // Mint to owner
      await mintTo(
        connection,
        payer,
        gameTokenMint,
        ownerTokenAccount,
        payer.publicKey,
        ownerTokens * 1_000_000 // Convert to smallest unit
      );

      totalCycles++;
      totalTokensMinted += (gameTokens + ownerTokens);

      // Wait for next cycle (10 seconds)
      const cycleDuration = Date.now() - cycleStartTime;
      const waitTime = Math.max(0, 10000 - cycleDuration); // 10 seconds per cycle

      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      // Progress update every 10 cycles
      if (totalCycles % 10 === 0) {
        const elapsedMinutes = (Date.now() - startTime) / (60 * 1000);
        const currentRate = totalTokensMinted / elapsedMinutes;
        console.log(`📈 Progress: ${totalCycles} cycles, ${totalTokensMinted} tokens, Rate: ${currentRate.toFixed(1)}/min`);
      }
    }

    const endTime = Date.now();
    const actualDurationSeconds = (endTime - startTime) / 1000;
    const actualDurationMinutes = actualDurationSeconds / 60;
    const actualTokensPerMinute = totalTokensMinted / actualDurationMinutes;

    // Get final balances
    const finalGameBalance = Number((await getAccount(connection, gamePoolsTokenAccount)).amount) / 1_000_000;
    const finalOwnerBalance = Number((await getAccount(connection, ownerTokenAccount)).amount) / 1_000_000;

    console.log('\n📊 FINAL BALANCES:');
    console.log(`Game Pool: ${finalGameBalance} tokens`);
    console.log(`Owner: ${finalOwnerBalance} tokens`);
    console.log(`Total: ${finalGameBalance + finalOwnerBalance} tokens`);

    console.log('\n⏱️ PRODUCTION RATE RESULTS:');
    console.log(`Duration: ${actualDurationSeconds.toFixed(2)} seconds (${actualDurationMinutes.toFixed(2)} minutes)`);
    console.log(`Total Cycles: ${totalCycles}`);
    console.log(`Tokens Minted: ${totalTokensMinted}`);
    console.log(`Actual Rate: ${actualTokensPerMinute.toFixed(2)} tokens/minute`);
    console.log(`Target Rate: ${targetTokensPerMinute} tokens/minute`);

    // Verify the rate
    const rateDifference = Math.abs(actualTokensPerMinute - targetTokensPerMinute);
    const rateAccuracy = (rateDifference / targetTokensPerMinute) * 100;

    console.log(`\n🔍 VERIFICATION:`);
    console.log(`Rate Difference: ${rateDifference.toFixed(2)} tokens/minute`);
    console.log(`Accuracy: ${(100 - rateAccuracy).toFixed(1)}%`);

    if (rateAccuracy < 10) { // Within 10% of target
      console.log('✅ SUCCESS: Token production rate meets target!');
    } else {
      console.log('❌ WARNING: Token production rate deviates from target');
    }

    // Distribution verification
    const gameTokensMinted = finalGameBalance - initialGameBalance;
    const ownerTokensMinted = finalOwnerBalance - initialOwnerBalance;
    const gamePercentage = (gameTokensMinted / totalTokensMinted * 100).toFixed(1);
    const ownerPercentage = (ownerTokensMinted / totalTokensMinted * 100).toFixed(1);

    console.log('\n📊 DISTRIBUTION VERIFICATION:');
    console.log(`Game Pool: ${gameTokensMinted} tokens (${gamePercentage}%)`);
    console.log(`Owner: ${ownerTokensMinted} tokens (${ownerPercentage}%)`);

    if (Math.abs(parseFloat(gamePercentage) - 80) < 5 && Math.abs(parseFloat(ownerPercentage) - 20) < 5) {
      console.log('✅ SUCCESS: 80/20 distribution maintained!');
    } else {
      console.log('❌ WARNING: Distribution ratio incorrect');
    }

    // Save results
    const results = {
      timestamp: new Date().toISOString(),
      testParameters: {
        targetTokensPerMinute,
        testDurationSeconds,
        cyclesPerMinute
      },
      results: {
        actualDurationMinutes: actualDurationMinutes.toFixed(2),
        totalCycles,
        totalTokensMinted,
        actualTokensPerMinute: actualTokensPerMinute.toFixed(2),
        rateAccuracy: (100 - rateAccuracy).toFixed(1) + '%',
        rateTargetMet: rateAccuracy < 10
      },
      distribution: {
        gameTokens: gameTokensMinted,
        ownerTokens: ownerTokensMinted,
        gamePercentage: gamePercentage + '%',
        ownerPercentage: ownerPercentage + '%',
        distributionCorrect: Math.abs(parseFloat(gamePercentage) - 80) < 5 && Math.abs(parseFloat(ownerPercentage) - 20) < 5
      },
      balances: {
        initial: {
          gamePool: initialGameBalance,
          owner: initialOwnerBalance,
          total: initialGameBalance + initialOwnerBalance
        },
        final: {
          gamePool: finalGameBalance,
          owner: finalOwnerBalance,
          total: finalGameBalance + finalOwnerBalance
        }
      }
    };

    fs.writeFileSync('./token_rate_verification.json', JSON.stringify(results, null, 2));
    console.log('\n💾 Results saved to token_rate_verification.json');

    console.log('\n🎉 TOKEN RATE VERIFICATION COMPLETE!');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  verifyTokenRate().catch(console.error);
}

module.exports = { verifyTokenRate };
