/**
 * TEST NEW LOGIC MANUALLY - Direct Devnet Testing
 *
 * Test 100 tokens/minute logic directly on devnet without IDL dependencies
 */

const fs = require('fs');
const path = require('path');
const { Connection, PublicKey, Keypair, Transaction, SystemProgram } = require('@solana/web3.js');

// Load wallet
const keypairPath = path.join(process.env.HOME || process.env.USERPROFILE, '.config', 'solana', 'id.json');
const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
const payer = Keypair.fromSecretKey(new Uint8Array(keypairData));

async function testNewLogicManually() {
    console.log('🎯 TESTING NEW AUTO-MINT LOGIC MANUALLY ON DEVNET');
    console.log('='.repeat(60));
    console.log();

    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    // Known addresses from previous deployment
    const gameTokenMint = new PublicKey('2AxM2y84vg5rwP7QK7mwmBBZrDnZpXZxKTwU5vvX1FWK');
    const ownerAccount = new PublicKey('8unZYfU5Xm1DCgnSt12jjqwXP1ifcMUSbFFerbBN8WYS');

    console.log('📋 NEW LOGIC SPECIFICATIONS:');
    console.log('   🎲 Tokens per mint: 100');
    console.log('   👤 Owner share: 20 tokens (20%)');
    console.log('   🏦 Game pool share: 80 tokens (80%)');
    console.log('   ⏰ Interval: 1 minute');
    console.log();

    // Check current balances
    console.log('💰 CURRENT BALANCES (BEFORE):');
    try {
        const { getAccount } = require('@solana/spl-token');

        const ownerBalanceBefore = Number((await getAccount(connection, ownerAccount)).amount) / 1_000_000;
        console.log(`   👤 Owner: ${ownerBalanceBefore} tokens`);

        // Try to check game pool balance
        const gamePoolAccount = new PublicKey('BwnPAXJ7FSQQkirnXzvLsELk5crhLxbzArwtcfgrGp19');
        try {
            const gamePoolBalance = Number((await getAccount(connection, gamePoolAccount)).amount) / 1_000_000;
            console.log(`   🏦 Game Pool: ${gamePoolBalance} tokens`);
        } catch (error) {
            console.log(`   🏦 Game Pool: Unable to check (${error.message})`);
        }

        console.log();

        // Simulate what new logic should do
        console.log('🎲 SIMULATING NEW LOGIC EXECUTION:');
        console.log('   📊 Minting 100 tokens with 80/20 distribution...');
        console.log('   ➡️ Owner should receive: +20 tokens');
        console.log('   ➡️ Game pool should receive: +80 tokens');
        console.log();

        // Since we can't call smart contract directly due to IDL issues,
        // let's check if we can at least verify the program exists
        console.log('🔍 CHECKING PROGRAM STATUS:');
        const programId = new PublicKey('Do9Bq3c7rSSU4YW32F3mCZekQZo5jdyaBuayqmNGAeTe');

        try {
            const programAccount = await connection.getAccountInfo(programId);
            if (programAccount) {
                console.log('   ✅ Smart contract exists on devnet');
                console.log(`   📊 Program size: ${programAccount.data.length} bytes`);
            } else {
                console.log('   ❌ Smart contract NOT found on devnet');
                console.log('   💡 Need to redeploy');
            }
        } catch (error) {
            console.log(`   ❌ Program check failed: ${error.message}`);
        }

        console.log();

        // Check PDA addresses
        console.log('🎯 CHECKING PDA ADDRESSES:');
        const [mintingAuthority] = PublicKey.findProgramAddressSync(
            [Buffer.from("minting_authority")],
            programId
        );

        const [gamePools] = PublicKey.findProgramAddressSync(
            [Buffer.from("game_pools")],
            programId
        );

        console.log(`   📍 Minting Authority: ${mintingAuthority.toString()}`);
        console.log(`   🏦 Game Pools: ${gamePools.toString()}`);

        // Check if PDAs exist
        const authAccount = await connection.getAccountInfo(mintingAuthority);
        const poolsAccount = await connection.getAccountInfo(gamePools);

        console.log(`   ✅ Minting Authority PDA: ${authAccount ? 'EXISTS' : 'MISSING'}`);
        console.log(`   ✅ Game Pools PDA: ${poolsAccount ? 'EXISTS' : 'MISSING'}`);

        console.log();

        // Recommendation
        console.log('🎯 RECOMMENDATION TO SYNC DEVNET:');

        if (!authAccount || !poolsAccount) {
            console.log('   1. 🔧 Initialize PDA accounts first');
            console.log('      • Run PDA initialization script');
        }

        console.log('   2. 🚀 Test new logic manually:');
        console.log('      • Create test transaction calling auto_mint_tokens(100)');
        console.log('      • Verify balances increase by 20 (owner) and 80 (game pool)');

        console.log();
        console.log('   3. 📊 Monitor results:');
        console.log('      • Check Solana Explorer for transactions');
        console.log('      • Verify token transfers');
        console.log('      • Confirm 80/20 distribution');

        console.log();
        console.log('   4. 🔄 Update deployment records:');
        console.log('      • Save new PDA addresses');
        console.log('      • Update devnet_deployment.json');

        console.log();

        // Summary
        console.log('📊 SUMMARY:');
        const issues = [];
        if (!authAccount) issues.push('Minting Authority PDA missing');
        if (!poolsAccount) issues.push('Game Pools PDA missing');

        if (issues.length === 0) {
            console.log('   ✅ Devnet infrastructure: READY');
            console.log('   ✅ New logic can be tested');
        } else {
            console.log('   ❌ Issues found:');
            issues.forEach(issue => console.log(`      • ${issue}`));
        }

        console.log('   🎯 Next step: Execute auto_mint_tokens(100) and verify results');

    } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
    }
}

// Run test
if (require.main === module) {
    testNewLogicManually().catch(console.error);
}

module.exports = { testNewLogicManually };
