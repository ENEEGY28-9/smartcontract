const { Connection, PublicKey, Keypair, Transaction, TransactionInstruction, sendAndConfirmTransaction } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, getAccount, transfer } = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');

async function realPlayerClaimSimulation(playerWalletAddress, claimAmount) {
  console.log('🎮 REAL PLAYER CLAIM SIMULATION');
  console.log('='.repeat(50));
  console.log(`👤 Player: ${playerWalletAddress}`);
  console.log(`💰 Claim Amount: ${claimAmount} tokens`);

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Load payer wallet (authority)
  const keypairPath = path.join(process.env.HOME || process.env.USERPROFILE, '.config', 'solana', 'id.json');
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const payer = Keypair.fromSecretKey(new Uint8Array(keypairData));

  // Addresses
  const gameTokenMint = new PublicKey('ANzKnYDd7BpiPEykuHxrfAsiox19aWzLbZrmQbL8J8Qk');
  const gamePoolTokenAccount = new PublicKey('HHHaKDSbruknbEFqwB3tfMQ5dAyatyavi15JHvFATssq');
  const playerWallet = new PublicKey(playerWalletAddress);

  // Get player ATA
  const { getAssociatedTokenAddress } = require('@solana/spl-token');
  const playerATA = await getAssociatedTokenAddress(gameTokenMint, playerWallet);

  console.log(`🎯 Player ATA: ${playerATA.toString()}`);
  console.log(`🏦 Game Pool: ${gamePoolTokenAccount.toString()}`);

  try {
    // Check initial balances
    console.log('\n💰 BALANCES BEFORE CLAIM:');
    const gamePoolBefore = await getAccount(connection, gamePoolTokenAccount);
    const playerBefore = await getAccount(connection, playerATA);

    console.log(`🏦 Game Pool: ${Number(gamePoolBefore.amount) / 1_000_000} tokens`);
    console.log(`🎮 Player: ${Number(playerBefore.amount) / 1_000_000} tokens`);

    // Method 1: Try to transfer from game pool using payer authority
    console.log('\n🔄 METHOD 1: Transfer from Game Pool (Authority)');

    try {
      const transferAmount = claimAmount * 1_000_000;

      await transfer(
        connection,
        payer,
        gamePoolTokenAccount,
        playerATA,
        payer,
        transferAmount
      );

      console.log(`✅ Transferred ${claimAmount} tokens from game pool to player!`);

      // Check final balances
      const gamePoolAfter = await getAccount(connection, gamePoolTokenAccount);
      const playerAfter = await getAccount(connection, playerATA);

      console.log('\n💰 BALANCES AFTER CLAIM:');
      console.log(`🏦 Game Pool: ${Number(gamePoolAfter.amount) / 1_000_000} tokens`);
      console.log(`🎮 Player: ${Number(playerAfter.amount) / 1_000_000} tokens`);

      const gamePoolDecreased = Number(gamePoolBefore.amount) - Number(gamePoolAfter.amount);
      const playerIncreased = Number(playerAfter.amount) - Number(playerBefore.amount);

      console.log('\n📊 CLAIM RESULT:');
      console.log(`✅ Game pool decreased: ${gamePoolDecreased / 1_000_000} tokens`);
      console.log(`✅ Player increased: ${playerIncreased / 1_000_000} tokens`);
      console.log(`✅ Claim successful!`);

      // Save result
      const result = {
        player: playerWalletAddress,
        claimed: claimAmount,
        method: 'Authority Transfer',
        gamePoolBefore: Number(gamePoolBefore.amount) / 1_000_000,
        gamePoolAfter: Number(gamePoolAfter.amount) / 1_000_000,
        playerBefore: Number(playerBefore.amount) / 1_000_000,
        playerAfter: Number(playerAfter.amount) / 1_000_000,
        success: true,
        timestamp: new Date().toISOString(),
        note: 'Real token transfer from game pool using authority'
      };

      fs.writeFileSync(`claim_result_${Date.now()}.json`, JSON.stringify(result, null, 2));

      return result;

    } catch (transferError) {
      console.log(`❌ Transfer failed: ${transferError.message}`);
      console.log('💡 This means payer is not the authority of game pool token account');
      console.log('💡 In real smart contract, PDA would be used as authority');
    }

    // Method 2: Fallback - Mint tokens to player (current simulation method)
    console.log('\n🔄 METHOD 2: Mint tokens to player (Current Simulation)');

    const { mintTo } = require('@solana/spl-token');

    await mintTo(
      connection,
      payer,
      gameTokenMint,
      playerATA,
      payer,
      claimAmount * 1_000_000
    );

    console.log(`✅ Minted ${claimAmount} tokens to player (simulation)`);

    // Check final balances
    const gamePoolAfter = await getAccount(connection, gamePoolTokenAccount);
    const playerAfter = await getAccount(connection, playerATA);

    console.log('\n💰 FINAL BALANCES:');
    console.log(`🏦 Game Pool: ${Number(gamePoolAfter.amount) / 1_000_000} tokens (unchanged ❌)`);
    console.log(`🎮 Player: ${Number(playerAfter.amount) / 1_000_000} tokens`);

    console.log('\n📊 FINAL RESULT:');
    console.log(`✅ Player received: ${claimAmount} tokens`);
    console.log(`❌ Game pool unchanged: Not real smart contract behavior`);

    // Save result
    const fallbackResult = {
      player: playerWalletAddress,
      claimed: claimAmount,
      method: 'Minting Simulation',
      gamePoolUnchanged: true,
      playerReceived: claimAmount,
      success: true,
      timestamp: new Date().toISOString(),
      note: 'Player got tokens via minting, not from game pool transfer'
    };

    fs.writeFileSync(`claim_fallback_${Date.now()}.json`, JSON.stringify(fallbackResult, null, 2));

    return fallbackResult;

  } catch (error) {
    console.error('❌ Claim failed:', error.message);
    return {
      success: false,
      error: error.message,
      player: playerWalletAddress,
      claimed: 0
    };
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node real_player_claim_simulation.js <player_wallet> <amount>');
    console.log('Example: node real_player_claim_simulation.js AfQLRj5iiY3NkTEKZg61RpEv6p9y9yjYzxhLR9fuiLoD 50');
    console.log('\nThis simulates real player claim behavior.');
    console.log('In real smart contract deployment, game pool would actually decrease.');
    return;
  }

  const playerWallet = args[0];
  const claimAmount = parseFloat(args[1]);

  if (isNaN(claimAmount) || claimAmount <= 0) {
    console.error('❌ Invalid claim amount');
    return;
  }

  const result = await realPlayerClaimSimulation(playerWallet, claimAmount);

  if (result.success) {
    console.log('\n🎉 CLAIM COMPLETED!');
    console.log(`   Player: ${result.player}`);
    console.log(`   Amount: ${result.claimed} tokens`);
    console.log(`   Method: ${result.method}`);
    if (result.gamePoolUnchanged) {
      console.log('   ⚠️ Note: Game pool unchanged (simulation mode)');
    }
  } else {
    console.log('\n❌ CLAIM FAILED!');
    console.log(`   Error: ${result.error}`);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { realPlayerClaimSimulation };



