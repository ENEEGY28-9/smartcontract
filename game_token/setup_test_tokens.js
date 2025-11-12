/**
 * SETUP TEST TOKENS - Add tokens to accounts for testing
 *
 * Add tokens to game pool account so we can test 100 tokens/minute logic
 */

const fs = require('fs');
const path = require('path');
const { Connection, PublicKey, Keypair, Transaction } = require('@solana/web3.js');
const { createTransferInstruction, getAssociatedTokenAddress, getAccount } = require('@solana/spl-token');

// Load wallet
const keypairPath = path.join(process.env.HOME || process.env.USERPROFILE, '.config', 'solana', 'id.json');
const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
const payer = Keypair.fromSecretKey(new Uint8Array(keypairData));

async function setupTestTokens() {
    console.log('💰 SETUP TEST TOKENS - Prepare accounts for 100 tokens/minute testing');
    console.log('='.repeat(70));
    console.log();

    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    // Existing accounts
    const gameTokenMint = new PublicKey('2AxM2y84vg5rwP7QK7mwmBBZrDnZpXZxKTwU5vvX1FWK');
    const ownerAccount = new PublicKey('5BzeVCppuFzyLs5aM1f3n8BatqoUCx9hg5N7288zRSCN');
    const gamePoolAccount = new PublicKey('5oU5mv3xjud2kgemjKwm5qK5Ar356rxboxbNmYXhuAJc');

    console.log('📋 ACCOUNTS:');
    console.log(`   🪙 Game Token Mint: ${gameTokenMint.toString().slice(0, 8)}...`);
    console.log(`   👤 Owner Account: ${ownerAccount.toString().slice(0, 8)}...`);
    console.log(`   🏦 Game Pool Account: ${gamePoolAccount.toString().slice(0, 8)}...`);
    console.log();

    // Check payer's token account
    console.log('🔍 CHECKING PAYER TOKEN ACCOUNT:');
    const payerTokenAccount = await getAssociatedTokenAddress(gameTokenMint, payer.publicKey);

    try {
        const payerBalance = Number((await getAccount(connection, payerTokenAccount)).amount) / 1_000_000;
        console.log(`   💳 Payer token balance: ${payerBalance} tokens`);
        console.log();

        if (payerBalance >= 200) { // Need at least 200 for testing
            console.log('✅ Sufficient tokens for setup!');
            console.log();

            // SETUP: Add tokens to game pool for testing
            console.log('🚀 SETTING UP TEST ACCOUNTS:');

            // Transfer 100 tokens to game pool for testing 100 tokens/minute logic
            const setupTransaction = new Transaction();

            setupTransaction.add(
                createTransferInstruction(
                    payerTokenAccount,
                    gamePoolAccount,
                    payer.publicKey,
                    100 * 1_000_000 // 100 tokens
                )
            );

            console.log('   📤 Adding 100 tokens to Game Pool for testing');
            console.log('   🎯 This simulates tokens available for auto-mint distribution');
            console.log();

            // Send setup transaction
            console.log('📡 EXECUTING SETUP TRANSACTION...');
            const setupSignature = await connection.sendTransaction(setupTransaction, [payer]);
            console.log(`   ✅ Setup transaction sent: ${setupSignature}`);

            // Wait for confirmation
            await connection.confirmTransaction(setupSignature, 'confirmed');
            console.log('   ✅ Setup transaction confirmed');
            console.log();

            // Check balances after setup
            console.log('💰 BALANCES AFTER SETUP:');

            const ownerBalanceAfter = Number((await getAccount(connection, ownerAccount)).amount) / 1_000_000;
            const gamePoolBalanceAfter = Number((await getAccount(connection, gamePoolAccount)).amount) / 1_000_000;
            const payerBalanceAfter = Number((await getAccount(connection, payerTokenAccount)).amount) / 1_000_000;

            console.log(`   👤 Owner: ${ownerBalanceAfter} tokens`);
            console.log(`   🏦 Game Pool: ${gamePoolBalanceAfter} tokens`);
            console.log(`   💳 Payer: ${payerBalanceAfter} tokens`);
            console.log(`   📊 Total: ${ownerBalanceAfter + gamePoolBalanceAfter + payerBalanceAfter} tokens`);
            console.log();

            if (gamePoolBalanceAfter >= 100) {
                console.log('🎉 SETUP COMPLETE!');
                console.log('   ✅ Game Pool has sufficient tokens for 100 tokens/minute testing');
                console.log('   ✅ Ready to run manual logic test');
                console.log();
                console.log('🚀 NEXT: Run "node manual_logic_test.js" to test the logic!');
                console.log();
                console.log('📋 EXPECTED TEST RESULTS:');
                console.log('   • Owner balance: +20 tokens');
                console.log('   • Game Pool balance: -20 tokens (transferred to owner)');
                console.log('   • Total tokens conserved');
                console.log('   • 80/20 distribution verified');
            } else {
                console.log('❌ Setup incomplete - Game Pool needs more tokens');
            }

            // Show explorer link
            console.log();
            console.log('🌐 View setup transaction:');
            console.log(`https://explorer.solana.com/tx/${setupSignature}?cluster=devnet`);

        } else {
            console.log(`❌ Insufficient tokens in payer account (${payerBalance} < 200)`);
            console.log('💡 Need at least 200 tokens for testing');
            console.log('💡 Consider:');
            console.log('   1. Get devnet SOL: solana airdrop 2');
            console.log('   2. Mint tokens to payer account');
            console.log('   3. Or use smaller test amounts');
        }

    } catch (error) {
        console.log(`❌ Setup failed: ${error.message}`);
        console.log('💡 Make sure payer has an associated token account');
    }
}

// Run setup
if (require.main === module) {
    setupTestTokens().catch(console.error);
}

module.exports = { setupTestTokens };
