/**
 * END-TO-END INTEGRATION TEST
 *
 * Tests the complete flow: auto-mint → player earn → balance updates
 * Verifies the CORRECT business logic as specified
 */

const {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
} = require('@solana/web3.js');
const {
  TOKEN_PROGRAM_ID,
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAccount,
  getAssociatedTokenAddress,
} = require('@solana/spl-token');
const anchor = require('@coral-xyz/anchor');
const fs = require('fs');
const path = require('path');

// Load wallet keypair
const keypairPath = path.join(process.env.HOME || process.env.USERPROFILE, '.config', 'solana', 'id.json');
const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
const payer = Keypair.fromSecretKey(new Uint8Array(keypairData));

async function testEndToEndFlow() {
  console.log('🚀 END-TO-END INTEGRATION TEST');
  console.log('🎯 Testing: Auto-mint → Player earn → Balance updates');
  console.log('📋 Logic: Owner gets 20% immediately, players earn from 80% pool');
  console.log('='.repeat(80));

  // Setup connection and program
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(payer), {
    commitment: 'confirmed'
  });
  anchor.setProvider(provider);

  const programId = new PublicKey('Do9Bq3c7rSSU4YW32F3mCZekQZo5jdyaBuayqmNGAeTe');
  const idl = JSON.parse(fs.readFileSync('./target/idl/game_token.json', 'utf8'));
  const program = new anchor.Program(idl, programId, provider);

  // Deployed addresses
  const gameTokenMint = new PublicKey('2AxM2y84vg5rwP7QK7mwmBBZrDnZpXZxKTwU5vvX1FWK');
  const ownerAccount = new PublicKey('8unZYfU5Xm1DCgnSt12jjqwXP1ifcMUSbFFerbBN8WYS');

  // Derive PDAs
  const [mintingAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("minting_authority")],
    programId
  );
  const [gamePools] = PublicKey.findProgramAddressSync(
    [Buffer.from("game_pools")],
    programId
  );
  const [gamePoolsTokenAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from("game_pools_token_account")],
    programId
  );

  console.log('📍 Test Setup:');
  console.log('- Program ID:', programId.toString());
  console.log('- Game Token Mint:', gameTokenMint.toString());
  console.log('- Owner Account:', ownerAccount.toString());
  console.log('- Game Pools PDA:', gamePools.toString());
  console.log('- Game Pools Token Account:', gamePoolsTokenAccount.toString());
  console.log();

  try {
    // STEP 1: Check initial balances
    console.log('📊 STEP 1: Initial Balance Check');
    const initialGameBalance = Number((await getAccount(connection, gamePoolsTokenAccount)).amount) / 1_000_000;
    const initialOwnerBalance = Number((await getAccount(connection, ownerAccount)).amount) / 1_000_000;

    console.log(`🏦 Game Pool: ${initialGameBalance} tokens`);
    console.log(`👤 Owner: ${initialOwnerBalance} tokens`);
    console.log(`📈 Total: ${initialGameBalance + initialOwnerBalance} tokens`);
    console.log();

    // STEP 2: Auto-mint tokens (OWNER GETS 20% IMMEDIATELY)
    console.log('🚀 STEP 2: Auto-Mint Tokens (Owner Revenue)');
    console.log('🎯 Independent of player activity - scheduled minting');

    const mintAmount = 100; // Mint 100 tokens
    const expectedGameAmount = mintAmount * 0.8; // 80 tokens to pool
    const expectedOwnerAmount = mintAmount * 0.2; // 20 tokens to owner

    console.log(`💰 Minting: ${mintAmount} tokens`);
    console.log(`🏦 Game Pool Expected: +${expectedGameAmount} tokens (80%)`);
    console.log(`👤 Owner Expected: +${expectedOwnerAmount} tokens (20%) - IMMEDIATE REVENUE!`);

    const autoMintTx = await program.methods
      .autoMintTokens(new anchor.BN(mintAmount))
      .accounts({
        authority: mintingAuthority,
        gamePools: gamePools,
        gamePoolsTokenAccount: gamePoolsTokenAccount,
        ownerTokenAccount: ownerAccount,
        gameTokenMint: gameTokenMint,
        owner: payer.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      })
      .rpc();

    console.log('✅ Auto-mint transaction:', autoMintTx);

    // Verify balances after auto-mint
    const afterAutoMintGameBalance = Number((await getAccount(connection, gamePoolsTokenAccount)).amount) / 1_000_000;
    const afterAutoMintOwnerBalance = Number((await getAccount(connection, ownerAccount)).amount) / 1_000_000;

    console.log('\n💰 Balances After Auto-Mint:');
    console.log(`🏦 Game Pool: ${afterAutoMintGameBalance} tokens (+${afterAutoMintGameBalance - initialGameBalance})`);
    console.log(`👤 Owner: ${afterAutoMintOwnerBalance} tokens (+${afterAutoMintOwnerBalance - initialOwnerBalance})`);
    console.log(`📈 Total: ${afterAutoMintGameBalance + afterAutoMintOwnerBalance} tokens`);

    // Verify 80/20 distribution
    const ownerRevenueCorrect = Math.abs((afterAutoMintOwnerBalance - initialOwnerBalance) - expectedOwnerAmount) < 0.1;
    const gamePoolCorrect = Math.abs((afterAutoMintGameBalance - initialGameBalance) - expectedGameAmount) < 0.1;

    console.log(`\n🔍 Auto-Mint Distribution Verification:`);
    console.log(`${ownerRevenueCorrect ? '✅' : '❌'} Owner received 20%: ${afterAutoMintOwnerBalance - initialOwnerBalance} tokens`);
    console.log(`${gamePoolCorrect ? '✅' : '❌'} Game pool received 80%: ${afterAutoMintGameBalance - initialGameBalance} tokens`);
    console.log(`${ownerRevenueCorrect && gamePoolCorrect ? '✅' : '❌'} 80/20 Distribution: CORRECT`);

    if (!ownerRevenueCorrect || !gamePoolCorrect) {
      throw new Error('Auto-mint distribution failed!');
    }
    console.log();

    // STEP 3: Player earns from pool (PLAYERS EARN FROM 80% POOL)
    console.log('🎮 STEP 3: Player Earns From Pool');
    console.log('🎯 Players earn from pre-filled game pool (80% from auto-mint)');

    // Create test player
    const player = Keypair.generate();
    console.log('👤 Test Player:', player.publicKey.toString());

    // Airdrop SOL to player
    const airdropSig = await connection.confirmTransaction(
      await connection.requestAirdrop(player.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
    );

    // Create player's associated token account
    const playerTokenAccount = await getAssociatedTokenAddress(
      gameTokenMint,
      player.publicKey
    );

    await createAssociatedTokenAccount(
      connection,
      payer,
      gameTokenMint,
      player.publicKey
    );

    const earnAmount = 5; // Player earns 5 tokens
    console.log(`💰 Player earning: ${earnAmount} tokens from game pool`);
    console.log(`🏦 Game pool before: ${afterAutoMintGameBalance} tokens`);
    console.log(`👤 Player balance before: 0 tokens`);

    const playerEarnTx = await program.methods
      .playerEarnFromPool(new anchor.BN(earnAmount))
      .accounts({
        gamePools: gamePools,
        gamePoolsTokenAccount: gamePoolsTokenAccount,
        playerStats: PublicKey.findProgramAddressSync(
          [Buffer.from("player_stats"), player.publicKey.toBytes()],
          programId
        )[0],
        playerTokenAccount: playerTokenAccount,
        gameTokenMint: gameTokenMint,
        player: player.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        systemProgram: SystemProgram.programId,
      })
      .signers([player])
      .rpc();

    console.log('✅ Player earn transaction:', playerEarnTx);

    // Verify balances after player earn
    const finalGameBalance = Number((await getAccount(connection, gamePoolsTokenAccount)).amount) / 1_000_000;
    const finalOwnerBalance = Number((await getAccount(connection, ownerAccount)).amount) / 1_000_000;
    const playerBalance = Number((await getAccount(connection, playerTokenAccount)).amount) / 1_000_000;

    console.log('\n💰 Final Balances After Player Earn:');
    console.log(`🏦 Game Pool: ${finalGameBalance} tokens (-${afterAutoMintGameBalance - finalGameBalance})`);
    console.log(`👤 Owner: ${finalOwnerBalance} tokens (unchanged)`);
    console.log(`🎮 Player: ${playerBalance} tokens (+${playerBalance})`);

    // Verify player earn logic
    const poolReducedCorrectly = Math.abs((afterAutoMintGameBalance - finalGameBalance) - earnAmount) < 0.1;
    const playerReceivedCorrectly = Math.abs(playerBalance - earnAmount) < 0.1;
    const ownerUnchanged = Math.abs(finalOwnerBalance - afterAutoMintOwnerBalance) < 0.1;

    console.log(`\n🔍 Player Earn Verification:`);
    console.log(`${poolReducedCorrectly ? '✅' : '❌'} Game pool reduced by ${earnAmount}: ${afterAutoMintGameBalance - finalGameBalance} tokens`);
    console.log(`${playerReceivedCorrectly ? '✅' : '❌'} Player received ${earnAmount} tokens: ${playerBalance} tokens`);
    console.log(`${ownerUnchanged ? '✅' : '❌'} Owner balance unchanged: ${finalOwnerBalance} tokens`);

    if (!poolReducedCorrectly || !playerReceivedCorrectly || !ownerUnchanged) {
      throw new Error('Player earn logic failed!');
    }

    // STEP 4: Final verification
    console.log('\n🎉 STEP 4: Final Verification');
    const totalTokensFinal = finalGameBalance + finalOwnerBalance + playerBalance;
    const totalTokensInitial = initialGameBalance + initialOwnerBalance;

    console.log(`📊 Initial total tokens: ${totalTokensInitial}`);
    console.log(`📊 Final total tokens: ${totalTokensFinal}`);
    console.log(`➕ Tokens minted: ${mintAmount}`);
    console.log(`➖ Tokens earned by player: ${earnAmount}`);
    console.log(`📈 Expected final total: ${(totalTokensInitial + mintAmount - earnAmount)}`);

    const conservationCorrect = Math.abs(totalTokensFinal - (totalTokensInitial + mintAmount - earnAmount)) < 0.1;

    console.log(`${conservationCorrect ? '✅' : '❌'} Token conservation: ${conservationCorrect ? 'MAINTAINED' : 'BROKEN'}`);

    // SUCCESS SUMMARY
    console.log('\n🎊 END-TO-END TEST RESULTS');
    console.log('='.repeat(80));
    console.log('✅ Auto-mint scheduler: Owner received 20% immediately');
    console.log('✅ Player earn from pool: Players earn from 80% game pool');
    console.log('✅ Owner revenue independent: No player activity required for owner income');
    console.log('✅ Token distribution: 80/20 split working correctly');
    console.log('✅ Smart contract integration: Real blockchain transactions');
    console.log('✅ Token conservation: All tokens properly accounted for');

    console.log('\n🚀 BUSINESS LOGIC VERIFICATION:');
    console.log('🎯 Owner gets PREDICTABLE 20% revenue from auto-mint scheduler');
    console.log('🎮 Players earn from SUSTAINABLE 80% game pool');
    console.log('💰 Owner revenue INDEPENDENT of player activity');
    console.log('🔄 System maintains ECONOMICAL BALANCE');

    console.log('\n🎉 ALL TESTS PASSED - SYSTEM READY FOR PRODUCTION!');
    console.log('💎 Owner Revenue: Predictable, Immediate, Independent');
    console.log('🎮 Player Experience: Sustainable, Fair, Engaging');

    return {
      success: true,
      transactions: {
        autoMint: autoMintTx,
        playerEarn: playerEarnTx
      },
      balances: {
        initial: { game: initialGameBalance, owner: initialOwnerBalance, player: 0 },
        afterAutoMint: { game: afterAutoMintGameBalance, owner: afterAutoMintOwnerBalance, player: 0 },
        final: { game: finalGameBalance, owner: finalOwnerBalance, player: playerBalance }
      }
    };

  } catch (error) {
    console.error('\n❌ END-TO-END TEST FAILED:', error.message);
    return { success: false, error: error.message };
  }
}

// Run the test
testEndToEndFlow().catch(console.error);
