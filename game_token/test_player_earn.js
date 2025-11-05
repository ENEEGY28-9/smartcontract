/**
 * Test Player Earn From Pool Functionality
 * Verify players can earn tokens from the game pool
 */

const anchor = require('@coral-xyz/anchor');
const { PublicKey, Keypair } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, createAccount, getAssociatedTokenAddress } = require('@solana/spl-token');
const fs = require('fs');

async function testPlayerEarn() {
    console.log('🎮 Testing Player Earn From Pool...');
    console.log('=================================');

    // Load configuration
    let config;
    try {
        config = JSON.parse(fs.readFileSync('./production_config.json'));
    } catch (error) {
        console.error('❌ Configuration not found. Run initialize_pdas.js first');
        return;
    }

    // Setup connection and wallet
    const connection = new anchor.web3.Connection(
        'https://api.devnet.solana.com',
        'confirmed'
    );

    const walletKeypair = anchor.web3.Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync(require('os').homedir() + '/.config/solana/id.json')))
    );

    const wallet = new anchor.Wallet(walletKeypair);
    const provider = new anchor.AnchorProvider(connection, wallet, {
        commitment: 'confirmed'
    });

    // Load program
    const idl = JSON.parse(fs.readFileSync('./target/idl/game_token.json'));
    const programId = new PublicKey(config.programId);
    const program = new anchor.Program(idl, programId, provider);

    console.log('📋 Test Setup:');
    console.log('• Program:', config.programId);
    console.log('• Game Pool:', config.gamePools);

    // Create test player
    const player = Keypair.generate();
    console.log('• Test Player:', player.publicKey.toString());

    // Airdrop SOL to player
    console.log('\n💰 Funding test player...');
    try {
        const airdropSig = await connection.confirmTransaction(
            await connection.requestAirdrop(player.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
        );
        console.log('✅ Player funded with 2 SOL');
    } catch (error) {
        console.error('❌ Failed to fund player:', error);
        return;
    }

    // Check initial game pool balance
    const initialGamePools = await program.account.gameTokenPools.fetch(config.gamePools);
    console.log('\n🏊 Initial Game Pool Balance:', initialGamePools.activePool.toString(), 'tokens');

    if (initialGamePools.activePool < 10) {
        console.log('⚠️ Game pool has low balance. Running auto-mint first...');

        // Run auto-mint to fill pool
        await program.methods
            .autoMintTokens(new anchor.BN(100))
            .accounts({
                authority: new PublicKey(config.mintingAuthority),
                gamePools: new PublicKey(config.gamePools),
                gamePoolsTokenAccount: new PublicKey(config.gamePoolsTokenAccount),
                ownerTokenAccount: await getAssociatedTokenAddress(
                    new PublicKey(config.gameTokenMint),
                    wallet.publicKey
                ),
                gameTokenMint: new PublicKey(config.gameTokenMint),
                owner: wallet.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
                clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
            })
            .rpc();

        console.log('✅ Auto-minted 100 tokens to fill pool');
    }

    // Create player's token account
    console.log('\n💳 Creating player token account...');
    const playerTokenAccount = await createAccount(
        connection,
        walletKeypair,
        new PublicKey(config.gameTokenMint),
        player.publicKey,
        undefined,
        undefined,
        TOKEN_PROGRAM_ID
    );
    console.log('✅ Player token account:', playerTokenAccount.toString());

    // Check player initial balance
    const initialPlayerBalance = await connection.getTokenAccountBalance(playerTokenAccount);
    console.log('🎯 Initial player balance:', initialPlayerBalance.value.uiAmount, 'tokens');

    // Test player earn from pool
    const earnAmount = 5; // Player earns 5 tokens
    console.log('\n🎮 Player earning', earnAmount, 'tokens from pool...');

    try {
        // Derive player stats PDA
        const [playerStats] = PublicKey.findProgramAddressSync(
            [Buffer.from("player_stats"), player.publicKey.toBytes()],
            program.programId
        );

        await program.methods
            .playerEarnFromPool(new anchor.BN(earnAmount))
            .accounts({
                gamePools: new PublicKey(config.gamePools),
                gamePoolsTokenAccount: new PublicKey(config.gamePoolsTokenAccount),
                playerStats: playerStats,
                playerTokenAccount: playerTokenAccount,
                gameTokenMint: new PublicKey(config.gameTokenMint),
                player: player.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
                clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([player])
            .rpc();

        console.log('✅ Player successfully earned', earnAmount, 'tokens!');

    } catch (error) {
        console.error('❌ Player earn failed:', error);
        return;
    }

    // Verify results
    console.log('\n🔍 Verification:');

    // Check final balances
    const finalGamePools = await program.account.gameTokenPools.fetch(config.gamePools);
    const finalPlayerBalance = await connection.getTokenAccountBalance(playerTokenAccount);

    console.log('• Game Pool Balance:');
    console.log('  Before:', initialGamePools.activePool.toString(), 'tokens');
    console.log('  After:', finalGamePools.activePool.toString(), 'tokens');
    console.log('  Difference:', (Number(initialGamePools.activePool) - Number(finalGamePools.activePool)), 'tokens');

    console.log('• Player Balance:');
    console.log('  Before:', initialPlayerBalance.value.uiAmount, 'tokens');
    console.log('  After:', finalPlayerBalance.value.uiAmount, 'tokens');
    console.log('  Difference:', (finalPlayerBalance.value.uiAmount - initialPlayerBalance.value.uiAmount), 'tokens');

    // Check player stats
    try {
        const [playerStats] = PublicKey.findProgramAddressSync(
            [Buffer.from("player_stats"), player.publicKey.toBytes()],
            program.programId
        );

        const playerStatsAccount = await program.account.playerMintStats.fetch(playerStats);
        console.log('• Player Stats:');
        console.log('  Session Tokens:', playerStatsAccount.sessionTokens.toString());
        console.log('  Total Earned:', playerStatsAccount.totalEarned.toString());
        console.log('  Last Mint Minute:', playerStatsAccount.lastMintMinute.toString());
    } catch (error) {
        console.warn('⚠️ Could not fetch player stats:', error.message);
    }

    // Validate results
    const expectedPoolReduction = earnAmount;
    const expectedPlayerIncrease = earnAmount;
    const actualPoolReduction = Number(initialGamePools.activePool) - Number(finalGamePools.activePool);
    const actualPlayerIncrease = finalPlayerBalance.value.uiAmount - initialPlayerBalance.value.uiAmount;

    console.log('\n✅ Validation:');
    if (actualPoolReduction === expectedPoolReduction) {
        console.log('✅ Game pool reduced by correct amount');
    } else {
        console.log('❌ Game pool reduction incorrect');
    }

    if (actualPlayerIncrease === expectedPlayerIncrease) {
        console.log('✅ Player received correct token amount');
    } else {
        console.log('❌ Player token amount incorrect');
    }

    if (actualPoolReduction === expectedPoolReduction && actualPlayerIncrease === expectedPlayerIncrease) {
        console.log('\n🎉 PLAYER EARN TEST: PASSED!');
        console.log('🎮 Players can successfully earn tokens from the game pool');
        console.log('💎 Game mechanics working correctly');
    } else {
        console.log('\n❌ PLAYER EARN TEST: FAILED!');
        console.log('🔧 Check smart contract logic and PDA initialization');
    }

    console.log('\n🔗 Verify on Solana Explorer:');
    console.log('• Player Account:', player.publicKey.toString());
    console.log('• Token Account:', playerTokenAccount.toString());
    console.log('• Game Pool:', config.gamePools);
}

// Run if called directly
if (require.main === module) {
    testPlayerEarn().catch(console.error);
}

module.exports = { testPlayerEarn };
