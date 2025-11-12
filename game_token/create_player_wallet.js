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
  createAssociatedTokenAccount,
  getAssociatedTokenAddress,
  mintTo,
  transfer,
  getAccount
} = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');

async function createPlayerWallet() {
  console.log('🎮 TẠO VÍ NGƯỜI CHƠI ĐỂ TEST CHUYỂN TOKEN');
  console.log('='.repeat(60));

  // Connect to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Load main wallet (payer)
  const keypairPath = path.join(process.env.HOME || process.env.USERPROFILE, '.config', 'solana', 'id.json');
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const payer = Keypair.fromSecretKey(new Uint8Array(keypairData));

  console.log('👤 Main Wallet:', payer.publicKey.toString());

  // Load production config
  const config = JSON.parse(fs.readFileSync('./production_config.json'));
  const gameTokenMint = new PublicKey(config.gameTokenMint);
  const gamePoolAccount = new PublicKey(config.gamePoolsTokenAccount);

  console.log('🪙 Game Token Mint:', gameTokenMint.toString());
  console.log('🏦 Game Pool Account:', gamePoolAccount.toString());

  // Step 1: Create Player Wallet
  console.log('\n1️⃣ TẠO VÍ NGƯỜI CHƠI...');
  const playerWallet = Keypair.generate();

  console.log('✅ Player Wallet Created:');
  console.log('   Public Key:', playerWallet.publicKey.toString());
  console.log('   Private Key (chỉ dùng cho test):', Buffer.from(playerWallet.secretKey).toString('hex'));

  // Save player wallet info
  const playerWalletInfo = {
    publicKey: playerWallet.publicKey.toString(),
    privateKey: Buffer.from(playerWallet.secretKey).toString('hex'),
    created: new Date().toISOString(),
    purpose: 'Test player wallet for token transfers'
  };

  fs.writeFileSync('./test_player_wallet.json', JSON.stringify(playerWalletInfo, null, 2));
  console.log('💾 Player wallet info saved to test_player_wallet.json');

  // Step 2: Transfer SOL from main wallet to player wallet (for fees)
  console.log('\n2️⃣ CHUYỂN SOL TỪ MAIN WALLET SANG VÍ NGƯỜI CHƠI...');

  const transferSOL = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: playerWallet.publicKey,
      lamports: 0.5 * LAMPORTS_PER_SOL // 0.5 SOL
    })
  );

  const signature = await sendAndConfirmTransaction(connection, transferSOL, [payer]);
  console.log('✅ SOL transfer signature:', signature);

  const playerBalance = await connection.getBalance(playerWallet.publicKey);
  console.log(`✅ Player wallet funded: ${playerBalance / LAMPORTS_PER_SOL} SOL`);

  // Step 3: Create Associated Token Account for Player
  console.log('\n3️⃣ TẠO ASSOCIATED TOKEN ACCOUNT CHO NGƯỜI CHƠI...');

  const playerATA = await getAssociatedTokenAddress(
    gameTokenMint,
    playerWallet.publicKey
  );

  console.log('🎯 Player ATA Address:', playerATA.toString());

  // Create ATA if not exists
  try {
    await createAssociatedTokenAccount(
      connection,
      payer, // payer
      gameTokenMint,
      playerWallet.publicKey // owner
    );
    console.log('✅ Player Associated Token Account created');
  } catch (error) {
    if (error.message.includes('already in use')) {
      console.log('✅ Player Associated Token Account already exists');
    } else {
      throw error;
    }
  }

  // Step 4: Mint tokens directly to Player (simulating game rewards)
  console.log('\n4️⃣ MINT TOKEN CHO NGƯỜI CHƠI (GAME REWARDS)...');

  const rewardAmount = 25; // 25 tokens as game reward

  // Check balances before minting
  const gamePoolBalanceBefore = Number((await getAccount(connection, gamePoolAccount)).amount) / 1_000_000;
  const playerATABalanceBefore = Number((await getAccount(connection, playerATA)).amount) / 1_000_000;

  console.log('💰 BALANCES BEFORE MINTING:');
  console.log(`   Game Pool: ${gamePoolBalanceBefore} tokens`);
  console.log(`   Player: ${playerATABalanceBefore} tokens`);

  // Mint tokens directly to player (simulating game reward distribution)
  await mintTo(
    connection,
    payer, // payer
    gameTokenMint, // mint
    playerATA, // destination (player ATA)
    payer.publicKey, // authority
    rewardAmount * 1_000_000 // amount in smallest units
  );

  console.log(`✅ Minted ${rewardAmount} tokens directly to Player (Game Reward)`);

  // Check balances after minting
  const gamePoolBalanceAfter = Number((await getAccount(connection, gamePoolAccount)).amount) / 1_000_000;
  const playerATABalanceAfter = Number((await getAccount(connection, playerATA)).amount) / 1_000_000;

  console.log('\n💰 BALANCES AFTER MINTING:');
  console.log(`   Game Pool: ${gamePoolBalanceAfter} tokens (unchanged)`);
  console.log(`   Player: ${playerATABalanceAfter} tokens (+${rewardAmount})`);

  // Step 5: Verify transaction
  console.log('\n5️⃣ XÁC MINH GIAO DỊCH...');

  const expectedPlayer = playerATABalanceBefore + rewardAmount;
  const mintSuccessful = Math.abs(playerATABalanceAfter - expectedPlayer) < 0.01;

  console.log('🔍 VERIFICATION:');
  console.log(`   Player received: ${playerATABalanceAfter} / ${expectedPlayer} ${mintSuccessful ? '✅' : '❌'}`);

  console.log(`\n${mintSuccessful ? '🎉' : '❌'} TOKEN MINTING ${mintSuccessful ? 'SUCCESSFUL' : 'FAILED'}!`);

  // Step 6: Save transaction details
  const transactionInfo = {
    timestamp: new Date().toISOString(),
    playerWallet: {
      publicKey: playerWallet.publicKey.toString(),
      ata: playerATA.toString()
    },
    minting: {
      amount: rewardAmount,
      to: playerATA.toString(),
      type: 'Game Reward Distribution',
      successful: mintSuccessful
    },
    balances: {
      before: {
        gamePool: gamePoolBalanceBefore,
        player: playerATABalanceBefore
      },
      after: {
        gamePool: gamePoolBalanceAfter,
        player: playerATABalanceAfter
      }
    },
    explorerLinks: {
      playerWallet: `https://explorer.solana.com/address/${playerWallet.publicKey.toString()}?cluster=devnet`,
      playerATA: `https://explorer.solana.com/address/${playerATA.toString()}?cluster=devnet`,
      gamePool: `https://explorer.solana.com/address/${gamePoolAccount.toString()}?cluster=devnet`
    }
  };

  fs.writeFileSync('./player_transfer_test.json', JSON.stringify(transactionInfo, null, 2));
  console.log('\n💾 Transaction details saved to player_transfer_test.json');

  // Step 7: Display explorer links
  console.log('\n🔗 EXPLORER LINKS:');
  console.log('🎮 Player Wallet:', transactionInfo.explorerLinks.playerWallet);
  console.log('💰 Player Token Account:', transactionInfo.explorerLinks.playerATA);
  console.log('🏦 Game Pool:', transactionInfo.explorerLinks.gamePool);

  console.log('\n✅ PLAYER WALLET CREATION AND TOKEN MINTING COMPLETE!');
  console.log('🎯 Player can now receive tokens as game rewards!');
  console.log('💡 Note: In production, tokens would come from game pool distribution');

  return {
    playerWallet: playerWalletInfo,
    playerATA: playerATA.toString(),
    mintSuccessful,
    balances: transactionInfo.balances
  };
}

// Run if called directly
if (require.main === module) {
  createPlayerWallet().catch(console.error);
}

module.exports = { createPlayerWallet };
