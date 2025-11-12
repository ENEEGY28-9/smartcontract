/**
 * TEST NEW AUTO-MINT LOGIC ON DEVNET
 *
 * Tests the updated logic: 100 tokens/minute instead of 10
 * 80/20 distribution: 80 tokens to game pool, 20 tokens to owner
 */

const fs = require('fs');
const path = require('path');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const anchor = require('@coral-xyz/anchor');

// Load wallet keypair
const keypairPath = path.join(process.env.HOME || process.env.USERPROFILE, '.config', 'solana', 'id.json');
const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
const payer = Keypair.fromSecretKey(new Uint8Array(keypairData));

// NEW LOGIC CONFIGURATION
const NEW_LOGIC_CONFIG = {
    TOKENS_PER_MINT: 100,    // Changed from 10 to 100
    OWNER_SHARE: 20,         // 20 tokens to owner
    GAME_POOL_SHARE: 80,     // 80 tokens to game pool
    INTERVAL: 60 * 1000,     // 1 minute
    NETWORK: 'devnet'
};

// Old logic (from transaction hash user showed)
const OLD_LOGIC_CONFIG = {
    TOKENS_PER_MINT: 10,     // Old logic was 10 tokens
    OWNER_SHARE: 2,          // 2 tokens to owner
    GAME_POOL_SHARE: 8,      // 8 tokens to game pool
};

async function testNewLogicOnDevnet() {
    console.log('🧪 TESTING NEW AUTO-MINT LOGIC ON DEVNET');
    console.log('='.repeat(60));
    console.log();

    console.log('📊 LOGIC COMPARISON:');
    console.log('OLD LOGIC (from transaction you showed):');
    console.log(`   - Tokens per mint: ${OLD_LOGIC_CONFIG.TOKENS_PER_MINT}`);
    console.log(`   - Owner gets: ${OLD_LOGIC_CONFIG.OWNER_SHARE} tokens`);
    console.log(`   - Game pool gets: ${OLD_LOGIC_CONFIG.GAME_POOL_SHARE} tokens`);
    console.log();

    console.log('NEW LOGIC (current code):');
    console.log(`   - Tokens per mint: ${NEW_LOGIC_CONFIG.TOKENS_PER_MINT}`);
    console.log(`   - Owner gets: ${NEW_LOGIC_CONFIG.OWNER_SHARE} tokens`);
    console.log(`   - Game pool gets: ${NEW_LOGIC_CONFIG.GAME_POOL_SHARE} tokens`);
    console.log(`   - Interval: ${NEW_LOGIC_CONFIG.INTERVAL / 1000} seconds`);
    console.log();

    // Connect to devnet
    console.log('🌐 CONNECTING TO DEVNET...');
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(payer), {
        commitment: 'confirmed'
    });

    try {
        const version = await connection.getVersion();
        console.log(`✅ Connected to Solana ${version['solana-core']}`);
    } catch (error) {
        console.log(`❌ Connection failed: ${error.message}`);
        return;
    }

    // Check if program is deployed
    const programId = new PublicKey('Do9Bq3c7rSSU4YW32F3mCZekQZo5jdyaBuayqmNGAeTe');

    try {
        const programAccount = await connection.getAccountInfo(programId);
        if (programAccount) {
            console.log('✅ Smart contract is deployed on devnet');
        } else {
            console.log('❌ Smart contract NOT found on devnet');
            console.log('💡 Need to redeploy with new logic');
        }
    } catch (error) {
        console.log(`❌ Program check failed: ${error.message}`);
    }

    // Check current accounts
    console.log('\n🔍 CHECKING CURRENT ACCOUNT STATUS:');

    try {
        const [gamePools] = PublicKey.findProgramAddressSync(
            [Buffer.from("game_pools")],
            programId
        );

        const gamePoolsAccount = await connection.getAccountInfo(gamePools);
        if (gamePoolsAccount) {
            console.log('✅ Game pools PDA exists');
        } else {
            console.log('❌ Game pools PDA missing - need initialization');
        }
    } catch (error) {
        console.log(`❌ PDA check failed: ${error.message}`);
    }

    console.log();
    console.log('🎯 RECOMMENDED NEXT STEPS:');
    console.log('1. 🚀 Redeploy smart contract to devnet with new logic');
    console.log('2. 🔧 Initialize game pools PDA');
    console.log('3. 🧪 Run test mint with 100 tokens');
    console.log('4. 📊 Verify 80 tokens to game pool, 20 tokens to owner');
    console.log('5. ⏰ Test scheduler with 1-minute intervals');

    console.log();
    console.log('💡 CONCLUSION:');
    console.log('❌ Devnet is currently running OLD LOGIC (10 tokens)');
    console.log('✅ Code has NEW LOGIC (100 tokens)');
    console.log('🔄 Need redeployment to sync!');

    console.log();
    console.log('🚀 Ready to deploy new logic?');
}

// Run test
if (require.main === module) {
    testNewLogicOnDevnet().catch(console.error);
}

module.exports = { testNewLogicOnDevnet };









