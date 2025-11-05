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
const fs = require('fs');
const path = require('path');

// Load wallet keypair
const keypairPath = path.join(process.env.HOME || process.env.USERPROFILE, '.config', 'solana', 'id.json');
const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
const payer = Keypair.fromSecretKey(new Uint8Array(keypairData));

async function testOwnerRevenue() {
  console.log('💰 Testing Owner Revenue - 20% Distribution\n');

  // Connect to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Use deployed addresses
  const gameTokenMint = new PublicKey('2AxM2y84vg5rwP7QK7mwmBBZrDnZpXZxKTwU5vvX1FWK');
  const gamePoolAccount = new PublicKey('BwnPAXJ7FSQQkirnXzvLsELk5crhLxbzArwtcfgrGp19');
  const ownerAccount = new PublicKey('8unZYfU5Xm1DCgnSt12jjqwXP1ifcMUSbFFerbBN8WYS');

  console.log('📍 Token Addresses:');
  console.log('- Game Token Mint:', gameTokenMint.toString());
  console.log('- Game Pool Account:', gamePoolAccount.toString());
  console.log('- Owner Account:', ownerAccount.toString());
  console.log();

  try {
    // Check initial balances
    console.log('💰 Initial Token Balances:');
    const initialGameBalance = Number((await getAccount(connection, gamePoolAccount)).amount) / 1_000_000;
    const initialOwnerBalance = Number((await getAccount(connection, ownerAccount)).amount) / 1_000_000;

    console.log(`Game Pool: ${initialGameBalance} tokens`);
    console.log(`Owner: ${initialOwnerBalance} tokens`);
    console.log(`Total: ${initialGameBalance + initialOwnerBalance} tokens`);
    console.log();

    // Simulate NEW 80/20 logic - additional minting
    console.log('⚡ Simulating Additional Particle Collections (80/20 Logic):\n');

    const additionalParticles = [
      { id: 1, location: { x: 300, y: 400 } },
      { id: 2, location: { x: 350, y: 450 } },
      { id: 3, location: { x: 400, y: 500 } },
      { id: 4, location: { x: 450, y: 550 } },
      { id: 5, location: { x: 500, y: 600 } }
    ];

    let additionalGameTokens = 0;
    let additionalOwnerTokens = 0;

    for (const particle of additionalParticles) {
      console.log(`Eating particle ${particle.id} at (${particle.location.x}, ${particle.location.y})`);

      // NEW LOGIC: Per particle = 1 unit, 80% game, 20% owner
      const totalPerParticle = 1;
      const gameAmount = totalPerParticle * 0.8; // 0.8 tokens
      const ownerAmount = totalPerParticle * 0.2; // 0.2 tokens

      // Mint to game pool (80%)
      await mintTo(
        connection,
        payer,
        gameTokenMint,
        gamePoolAccount,
        payer,
        gameAmount * 1_000_000
      );

      // Mint to owner (20%)
      await mintTo(
        connection,
        payer,
        gameTokenMint,
        ownerAccount,
        payer,
        ownerAmount * 1_000_000
      );

      additionalGameTokens += gameAmount;
      additionalOwnerTokens += ownerAmount;

      console.log(`  ✅ Minted: Game +${gameAmount}, Owner +${ownerAmount}`);
    }

    console.log();
    console.log('📊 Additional Minting Results:');
    console.log(`Game Pool Added: ${additionalGameTokens} tokens`);
    console.log(`Owner Added: ${additionalOwnerTokens} tokens`);
    console.log(`Total Added: ${additionalGameTokens + additionalOwnerTokens} tokens`);
    console.log(`Distribution: ${(additionalGameTokens/(additionalGameTokens + additionalOwnerTokens)*100).toFixed(1)}% / ${(additionalOwnerTokens/(additionalGameTokens + additionalOwnerTokens)*100).toFixed(1)}%`);

    // Check final balances
    console.log('\n💰 Final Token Balances:');
    const finalGameBalance = Number((await getAccount(connection, gamePoolAccount)).amount) / 1_000_000;
    const finalOwnerBalance = Number((await getAccount(connection, ownerAccount)).amount) / 1_000_000;

    console.log(`Game Pool: ${finalGameBalance} tokens`);
    console.log(`Owner: ${finalOwnerBalance} tokens`);
    console.log(`Total: ${finalGameBalance + finalOwnerBalance} tokens`);

    // Verify distribution
    console.log('\n🔍 Final Distribution Analysis:');
    const totalTokens = finalGameBalance + finalOwnerBalance;
    const expectedGameAmount = totalTokens * 0.8;
    const expectedOwnerAmount = totalTokens * 0.2;

    console.log(`Expected Game (80%): ${expectedGameAmount.toFixed(1)} tokens`);
    console.log(`Actual Game: ${finalGameBalance} tokens`);
    console.log(`Expected Owner (20%): ${expectedOwnerAmount.toFixed(1)} tokens`);
    console.log(`Actual Owner: ${finalOwnerBalance} tokens`);

    const distributionCorrect = Math.abs(finalGameBalance - expectedGameAmount) < 0.1 &&
                               Math.abs(finalOwnerBalance - expectedOwnerAmount) < 0.1;

    console.log(`\n${distributionCorrect ? '✅' : '❌'} FINAL VERIFICATION: ${distributionCorrect ? 'OWNER REVENUE CORRECT (20%)' : 'DISTRIBUTION ERROR'}`);

    // Owner revenue summary
    console.log('\n💎 OWNER REVENUE SUMMARY:');
    console.log(`Initial Owner Balance: ${initialOwnerBalance} tokens`);
    console.log(`Final Owner Balance: ${finalOwnerBalance} tokens`);
    console.log(`Owner Revenue from ${additionalParticles.length} particles: ${additionalOwnerTokens} tokens`);
    console.log(`Revenue per Particle: ${additionalOwnerTokens / additionalParticles.length} tokens`);
    console.log(`Revenue Rate: ${(additionalOwnerTokens / additionalParticles.length * 100).toFixed(1)}% per particle`);

    console.log('\n🎯 CONCLUSION:');
    if (distributionCorrect) {
      console.log('✅ Owner receives EXACTLY 20% of all minted tokens');
      console.log('✅ Revenue is PREDICTABLE and IMMEDIATE');
      console.log('✅ No dependency on player activity');
      console.log('✅ Logic 80/20 is WORKING PERFECTLY');
    } else {
      console.log('❌ Distribution verification failed');
    }

    return {
      success: distributionCorrect,
      initialBalances: {
        game: initialGameBalance,
        owner: initialOwnerBalance
      },
      finalBalances: {
        game: finalGameBalance,
        owner: finalOwnerBalance
      },
      additionalTokens: {
        game: additionalGameTokens,
        owner: additionalOwnerTokens
      }
    };

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run test
testOwnerRevenue().catch(console.error);

