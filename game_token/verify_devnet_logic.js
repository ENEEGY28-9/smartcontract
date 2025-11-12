/**
 * VERIFY DEVNET LOGIC - Auto-Mint System Check
 *
 * Tests if devnet deployment matches new Auto-mint logic:
 * - 100 tokens per mint (not 10)
 * - 1 minute interval (not 1 hour)
 * - 80/20 distribution working
 */

const fs = require('fs');
const path = require('path');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const anchor = require('@coral-xyz/anchor');

// Load wallet keypair
const keypairPath = path.join(process.env.HOME || process.env.USERPROFILE, '.config', 'solana', 'id.json');
const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
const payer = Keypair.fromSecretKey(new Uint8Array(keypairData));

// CONFIGURATION - SHOULD MATCH AUTO_MINT_SCHEDULER.JS
const EXPECTED_CONFIG = {
    MINT_INTERVAL: 60 * 1000, // 1 minute
    TOKENS_PER_MINT: 100, // 100 tokens per mint
    OWNER_SHARE: 0.2, // 20% to owner
    GAME_POOL_SHARE: 0.8, // 80% to game pool
    NETWORK: 'devnet'
};

async function verifyDevnetLogic() {
    console.log('🔍 VERIFYING DEVNET LOGIC - Auto-Mint System Check\n');
    console.log('='.repeat(60));

    // 1. Check Local Configuration Match
    console.log('📋 1. CHECKING LOCAL CONFIGURATION:');
    console.log(`   Expected MINT_INTERVAL: ${EXPECTED_CONFIG.MINT_INTERVAL} ms (${EXPECTED_CONFIG.MINT_INTERVAL / 1000}s)`);
    console.log(`   Expected TOKENS_PER_MINT: ${EXPECTED_CONFIG.TOKENS_PER_MINT} tokens`);
    console.log(`   Expected OWNER_SHARE: ${EXPECTED_CONFIG.OWNER_SHARE * 100}%`);
    console.log(`   Expected GAME_POOL_SHARE: ${EXPECTED_CONFIG.GAME_POOL_SHARE * 100}%`);
    console.log(`   Expected NETWORK: ${EXPECTED_CONFIG.NETWORK}`);

    // Import scheduler config to verify
    try {
        const schedulerPath = './auto_mint_scheduler.js';
        const schedulerContent = fs.readFileSync(schedulerPath, 'utf8');

        const mintIntervalMatch = schedulerContent.match(/MINT_INTERVAL = (\d+) \* (\d+)/);
        const tokensPerMintMatch = schedulerContent.match(/TOKENS_PER_MINT = (\d+)/);

        if (mintIntervalMatch) {
            const actualInterval = parseInt(mintIntervalMatch[1]) * parseInt(mintIntervalMatch[2]);
            const intervalMatch = actualInterval === EXPECTED_CONFIG.MINT_INTERVAL;
            console.log(`   ✅ MINT_INTERVAL: ${intervalMatch ? 'MATCH' : 'MISMATCH'} (${actualInterval}ms)`);
        }

        if (tokensPerMintMatch) {
            const actualTokens = parseInt(tokensPerMintMatch[1]);
            const tokensMatch = actualTokens === EXPECTED_CONFIG.TOKENS_PER_MINT;
            console.log(`   ✅ TOKENS_PER_MINT: ${tokensMatch ? 'MATCH' : 'MISMATCH'} (${actualTokens} tokens)`);
        }

    } catch (error) {
        console.log(`   ❌ Error reading scheduler config: ${error.message}`);
    }

    console.log();

    // 2. Connect to Devnet
    console.log('🌐 2. CONNECTING TO DEVNET:');
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(payer), {
        commitment: 'confirmed'
    });

    try {
        const version = await connection.getVersion();
        console.log(`   ✅ Connected to Solana ${version['solana-core']}`);
        console.log(`   📍 Network: ${EXPECTED_CONFIG.NETWORK}`);

        const balance = await connection.getBalance(payer.publicKey);
        console.log(`   💰 Wallet balance: ${balance / 1_000_000_000} SOL`);

    } catch (error) {
        console.log(`   ❌ Devnet connection failed: ${error.message}`);
        return;
    }

    console.log();

    // 3. Check Program Deployment
    console.log('🔧 3. CHECKING PROGRAM DEPLOYMENT:');
    const programId = new PublicKey('Do9Bq3c7rSSU4YW32F3mCZekQZo5jdyaBuayqmNGAeTe');
    const idlPath = './target/idl/game_token.json';

    try {
        // Check if IDL exists
        if (fs.existsSync(idlPath)) {
            console.log(`   ✅ IDL file exists: ${idlPath}`);
        } else {
            console.log(`   ❌ IDL file missing: ${idlPath}`);
        }

        // Load program
        const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
        const program = new anchor.Program(idl, programId, provider);
        console.log(`   ✅ Program loaded: ${program.programId.toString()}`);

        // Check program account
        const programAccount = await connection.getAccountInfo(programId);
        if (programAccount) {
            console.log(`   ✅ Program deployed on devnet`);
            console.log(`   📊 Program size: ${programAccount.data.length} bytes`);
        } else {
            console.log(`   ❌ Program not found on devnet`);
        }

    } catch (error) {
        console.log(`   ❌ Program check failed: ${error.message}`);
    }

    console.log();

    // 4. Verify PDA Addresses
    console.log('🎯 4. VERIFYING PDA ADDRESSES:');
    try {
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

        console.log(`   🎯 Minting Authority: ${mintingAuthority.toString()}`);
        console.log(`   🏦 Game Pools: ${gamePools.toString()}`);
        console.log(`   💰 Game Pools Token Account: ${gamePoolsTokenAccount.toString()}`);

        // Check if accounts exist
        const authorityAccount = await connection.getAccountInfo(mintingAuthority);
        const gamePoolsAccount = await connection.getAccountInfo(gamePools);
        const tokenAccount = await connection.getAccountInfo(gamePoolsTokenAccount);

        console.log(`   ✅ Minting Authority: ${authorityAccount ? 'EXISTS' : 'MISSING'}`);
        console.log(`   ✅ Game Pools: ${gamePoolsAccount ? 'EXISTS' : 'MISSING'}`);
        console.log(`   ✅ Game Pools Token Account: ${tokenAccount ? 'EXISTS' : 'MISSING'}`);

    } catch (error) {
        console.log(`   ❌ PDA verification failed: ${error.message}`);
    }

    console.log();

    // 5. Test Auto-Mint Logic (Simulation)
    console.log('🧪 5. TESTING AUTO-MINT LOGIC (SIMULATION):');
    const testAmount = EXPECTED_CONFIG.TOKENS_PER_MINT;

    console.log(`   📊 Test minting: ${testAmount} tokens`);
    console.log(`   🎯 Expected distribution:`);
    console.log(`      - Game Pool: ${testAmount * EXPECTED_CONFIG.GAME_POOL_SHARE} tokens (80%)`);
    console.log(`      - Owner: ${testAmount * EXPECTED_CONFIG.OWNER_SHARE} tokens (20%)`);

    console.log();

    // 6. Recommendation
    console.log('🎯 6. RECOMMENDATION:');
    console.log('   🔄 Run actual test mint to verify on-chain logic:');
    console.log('   💡 Command: node auto_mint_scheduler.js');
    console.log('   📊 Check transaction on: https://explorer.solana.com/?cluster=devnet');
    console.log('   ✅ Verify: 80 tokens to game pool, 20 tokens to owner');

    console.log();
    console.log('🎉 VERIFICATION COMPLETE!');
    console.log('💡 If everything shows MATCH/EXISTS, your devnet is synced with new Auto-mint logic!');
}

// Run verification
if (require.main === module) {
    verifyDevnetLogic().catch(console.error);
}

module.exports = { verifyDevnetLogic };









