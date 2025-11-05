/**
 * MINT TOKENS FOR TESTING - Create tokens for test accounts
 *
 * Since we can't deploy smart contract, we'll manually mint tokens
 * to payer account so we can test the distribution logic
 */

const fs = require('fs');
const path = require('path');
const { Connection, PublicKey, Keypair, Transaction } = require('@solana/web3.js');
const { createMintToInstruction, getAssociatedTokenAddress, getAccount, createAssociatedTokenAccountInstruction } = require('@solana/spl-token');

// Load wallet
const keypairPath = path.join(process.env.HOME || process.env.USERPROFILE, '.config', 'solana', 'id.json');
const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
const payer = Keypair.fromSecretKey(new Uint8Array(keypairData));

async function mintTokensForTesting() {
    console.log('🪙 MINT TOKENS FOR TESTING - Prepare accounts for logic verification');
    console.log('='.repeat(70));
    console.log();

    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    // Existing mint (from previous deployment)
    const gameTokenMint = new PublicKey('FBDh1XC9nNn1XqEgi1FBXgrsJ14xw7chQzvoB2WnrMcX');
    const ownerAccount = new PublicKey('B8MM5t3qTxBSx7mpaRvu4AJmMAZeHUty1LUVtfXs7QUv');

    console.log('📋 MINT SETUP:');
    console.log(`   🪙 Game Token Mint: ${gameTokenMint.toString()}`);
    console.log(`   👤 Mint Authority: ${payer.publicKey.toString().slice(0, 8)}...`);
    console.log('   🎯 Target: Mint 200 tokens to payer account');
    console.log();

    try {
        // Get payer's associated token account
        const payerTokenAccount = await getAssociatedTokenAddress(gameTokenMint, payer.publicKey);
        console.log(`   💳 Payer Token Account: ${payerTokenAccount.toString()}`);
        console.log();

        // Check if payer token account exists
        let accountExists = false;
        try {
            await getAccount(connection, payerTokenAccount);
            accountExists = true;
            console.log('✅ Payer token account exists');
        } catch (error) {
            console.log('❌ Payer token account does not exist');
            console.log('🔧 Creating associated token account...');

            // Create associated token account
            const createAccountIx = createAssociatedTokenAccountInstruction(
                payer.publicKey, // payer
                payerTokenAccount, // associated token account
                payer.publicKey, // owner
                gameTokenMint // mint
            );

            const createTx = new Transaction().add(createAccountIx);
            const createSignature = await connection.sendTransaction(createTx, [payer]);
            await connection.confirmTransaction(createSignature, 'confirmed');

            console.log('✅ Associated token account created');
            console.log(`   📄 Transaction: ${createSignature}`);
            accountExists = true;
        }

        if (accountExists) {
            console.log();
            console.log('🪙 MINTING TOKENS:');

            // Mint 200 tokens to payer account
            const mintAmount = 200; // 200 tokens for testing
            const mintIx = createMintToInstruction(
                gameTokenMint, // mint
                payerTokenAccount, // destination
                payer.publicKey, // authority
                mintAmount * 1_000_000 // amount (with decimals)
            );

            const mintTx = new Transaction().add(mintIx);

            console.log(`   📤 Minting ${mintAmount} tokens to payer account...`);

            const mintSignature = await connection.sendTransaction(mintTx, [payer]);
            await connection.confirmTransaction(mintSignature, 'confirmed');

            console.log('✅ Mint transaction successful!');
            console.log(`   📄 Transaction: ${mintSignature}`);
            console.log();

            // Check balances after minting
            console.log('💰 BALANCES AFTER MINTING:');

            const payerBalanceAfter = Number((await getAccount(connection, payerTokenAccount)).amount) / 1_000_000;
            const ownerBalanceAfter = Number((await getAccount(connection, ownerAccount)).amount) / 1_000_000;

            console.log(`   💳 Payer: ${payerBalanceAfter} tokens (+${mintAmount})`);
            console.log(`   👤 Owner: ${ownerBalanceAfter} tokens`);
            console.log();

            if (payerBalanceAfter >= 200) {
                console.log('🎉 MINTING COMPLETE!');
                console.log('   ✅ Payer has sufficient tokens for testing');
                console.log('   ✅ Ready to setup test accounts');
                console.log();
                console.log('🚀 NEXT STEPS:');
                console.log('   1. Run: node setup_test_tokens.js');
                console.log('   2. Run: node manual_logic_test.js');
                console.log('   3. Verify 100 tokens/minute logic');
                console.log();
                console.log('💎 This will prove the Auto-mint logic works correctly!');
            } else {
                console.log('❌ Minting failed - insufficient tokens');
            }

            // Show explorer link
            console.log();
            console.log('🌐 View mint transaction:');
            console.log(`https://explorer.solana.com/tx/${mintSignature}?cluster=devnet`);
        }

    } catch (error) {
        console.log(`❌ Minting failed: ${error.message}`);
        console.log('💡 Possible issues:');
        console.log('   • Mint authority not set correctly');
        console.log('   • Insufficient permissions');
        console.log('   • Network issues');
        console.log();
        console.log('🔄 Alternative: Use existing token balances for smaller tests');
    }
}

// Run minting
if (require.main === module) {
    mintTokensForTesting().catch(console.error);
}

module.exports = { mintTokensForTesting };
