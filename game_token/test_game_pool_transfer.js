const {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  TransactionInstruction
} = require('@solana/web3.js');
const {
  TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddress
} = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');

async function testGamePoolTransfer() {
  console.log('🎮 TEST GAME POOL TO PLAYER TRANSFER VIA SMART CONTRACT');
  console.log('='.repeat(70));

  // Connect to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Load main wallet (payer)
  const keypairPath = path.join(process.env.HOME || process.env.USERPROFILE, '.config', 'solana', 'id.json');
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const payer = Keypair.fromSecretKey(new Uint8Array(keypairData));

  console.log('👤 Main Wallet:', payer.publicKey.toString());

  // Load production config
  const config = JSON.parse(fs.readFileSync('./production_config.json'));
  const programId = new PublicKey(config.programId);
  const gameTokenMint = new PublicKey(config.gameTokenMint);
  const gamePoolsPDA = new PublicKey(config.gamePools);
  const gamePoolsTokenAccount = new PublicKey(config.gamePoolsTokenAccount);

  console.log('📋 Program ID:', programId.toString());
  console.log('🪙 Game Token Mint:', gameTokenMint.toString());
  console.log('🏦 Game Pools PDA:', gamePoolsPDA.toString());
  console.log('🏦 Game Pools Token Account:', gamePoolsTokenAccount.toString());

  // Player wallet (from previous test)
  const playerWallet = new PublicKey('AfQLRj5iiY3NkTEKZg61RpEv6p9y9yjYzxhLR9fuiLoD');
  const playerATA = new PublicKey('qtfAibpP5SqJYLGTPedAJF8kTcnzZxeGXuxUDKw85ki');

  console.log('🎮 Player Wallet:', playerWallet.toString());
  console.log('💰 Player ATA:', playerATA.toString());

  try {
    // Check balances before transfer
    console.log('\n💰 BALANCES BEFORE TRANSFER:');
    const gamePoolBalanceBefore = Number((await getAccount(connection, gamePoolsTokenAccount)).amount) / 1_000_000;
    const playerATABalanceBefore = Number((await getAccount(connection, playerATA)).amount) / 1_000_000;

    console.log(`🏦 Game Pool: ${gamePoolBalanceBefore} tokens`);
    console.log(`🎮 Player: ${playerATABalanceBefore} tokens`);

    // Amount to transfer
    const transferAmount = 15; // 15 tokens
    console.log(`\n⚡ TRANSFERRING ${transferAmount} TOKENS FROM GAME POOL TO PLAYER`);

    // Create instruction data for DistributeGameTokens
    // Instruction tag = 2 (from our enum)
    const instructionData = Buffer.alloc(9); // 1 byte tag + 8 bytes u64
    instructionData.writeUInt8(2, 0); // tag = 2
    instructionData.writeBigUInt64LE(BigInt(transferAmount * 1_000_000), 1); // amount in smallest units

    // Create instruction accounts
    const accounts = [
      { pubkey: gamePoolsPDA, isSigner: false, isWritable: true }, // game_pools_info
      { pubkey: gamePoolsTokenAccount, isSigner: false, isWritable: true }, // game_pools_token_account_info
      { pubkey: playerATA, isSigner: false, isWritable: true }, // player_token_account_info
      { pubkey: gameTokenMint, isSigner: false, isWritable: false }, // game_token_mint_info
      { pubkey: new PublicKey('6JeJbrNocHap3ZNxjrewQHhT3FcURkdDAWTXHirbKzeE'), isSigner: false, isWritable: false }, // authority_info (minting authority PDA)
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token_program_info
      { pubkey: payer.publicKey, isSigner: true, isWritable: false }, // owner_info
    ];

    // Create transaction instruction
    const distributeIx = new TransactionInstruction({
      keys: accounts,
      programId: programId,
      data: instructionData
    });

    // Create and send transaction
    const transaction = new Transaction().add(distributeIx);

    console.log('🚀 Sending transaction...');

    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [payer]
    );

    console.log('✅ Transaction confirmed!');
    console.log('🔗 Signature:', signature);

    // Check balances after transfer
    const gamePoolBalanceAfter = Number((await getAccount(connection, gamePoolsTokenAccount)).amount) / 1_000_000;
    const playerATABalanceAfter = Number((await getAccount(connection, playerATA)).amount) / 1_000_000;

    console.log('\n💰 BALANCES AFTER TRANSFER:');
    console.log(`🏦 Game Pool: ${gamePoolBalanceAfter} tokens (${gamePoolBalanceBefore > gamePoolBalanceAfter ? '-' : ''}${Math.abs(gamePoolBalanceBefore - gamePoolBalanceAfter)})`);
    console.log(`🎮 Player: ${playerATABalanceAfter} tokens (+${transferAmount})`);

    // Verify transfer
    const expectedGamePool = gamePoolBalanceBefore - transferAmount;
    const expectedPlayer = playerATABalanceBefore + transferAmount;

    const transferSuccessful = Math.abs(gamePoolBalanceAfter - expectedGamePool) < 0.01 &&
                              Math.abs(playerATABalanceAfter - expectedPlayer) < 0.01;

    console.log('\n🔍 VERIFICATION:');
    console.log(`Expected Game Pool: ${expectedGamePool.toFixed(1)} tokens`);
    console.log(`Actual Game Pool: ${gamePoolBalanceAfter} tokens`);
    console.log(`Expected Player: ${expectedPlayer.toFixed(1)} tokens`);
    console.log(`Actual Player: ${playerATABalanceAfter} tokens`);

    console.log(`\n${transferSuccessful ? '🎉' : '❌'} GAME POOL TRANSFER ${transferSuccessful ? 'SUCCESSFUL' : 'FAILED'}!`);

    if (transferSuccessful) {
      console.log('\n✅ PLAYER CAN NOW RECEIVE TOKENS FROM GAME POOL!');
      console.log('🎮 The smart contract successfully transferred tokens from game pool to player wallet');
      console.log('💡 This proves the system can distribute game rewards to players');
    }

    // Save results
    const results = {
      timestamp: new Date().toISOString(),
      transfer: {
        amount: transferAmount,
        from: gamePoolsTokenAccount.toString(),
        to: playerATA.toString(),
        signature: signature,
        successful: transferSuccessful
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
        transaction: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
        gamePool: `https://explorer.solana.com/address/${gamePoolsTokenAccount.toString()}?cluster=devnet`,
        playerATA: `https://explorer.solana.com/address/${playerATA.toString()}?cluster=devnet`
      }
    };

    fs.writeFileSync('./game_pool_transfer_test.json', JSON.stringify(results, null, 2));
    console.log('\n💾 Results saved to game_pool_transfer_test.json');

    console.log('\n🔗 EXPLORER LINKS:');
    console.log('📄 Transaction:', results.explorerLinks.transaction);
    console.log('🏦 Game Pool:', results.explorerLinks.gamePool);
    console.log('🎮 Player:', results.explorerLinks.playerATA);

  } catch (error) {
    console.error('❌ Transfer failed:', error.message);

    // If smart contract instruction fails, try fallback method
    console.log('\n🔄 Trying fallback: Direct mint to player...');

    try {
      const { mintTo } = require('@solana/spl-token');

      const fallbackAmount = 15;
      await mintTo(
        connection,
        payer,
        gameTokenMint,
        playerATA,
        payer.publicKey,
        fallbackAmount * 1_000_000
      );

      console.log(`✅ Fallback successful: Minted ${fallbackAmount} tokens directly to player`);
      console.log('💡 Smart contract transfer failed, but direct minting works');

    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError.message);
    }
  }
}

// Run if called directly
if (require.main === module) {
  testGamePoolTransfer().catch(console.error);
}

module.exports = { testGamePoolTransfer };



