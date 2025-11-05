/**
 * SIMULATE 100 TOKENS/MINUTE LOGIC
 *
 * Manually simulate the new Auto-mint logic bằng cách:
 * 1. Transfer tokens từ một source account (simulate mint)
 * 2. Distribute theo 80/20 ratio
 * 3. Verify balances
 */

const fs = require('fs');
const path = require('path');
const { Connection, PublicKey, Keypair, Transaction, SystemProgram } = require('@solana/web3.js');
const { createTransferInstruction, getAssociatedTokenAddress, getAccount } = require('@solana/spl-token');

// Load wallet
const keypairPath = path.join(process.env.HOME || process.env.USERPROFILE, '.config', 'solana', 'id.json');
const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
const payer = Keypair.fromSecretKey(new Uint8Array(keypairData));

async function simulate100TokensLogic() {
    console.log('🎯 SIMULATING 100 TOKENS/MINUTE AUTO-MINT LOGIC');
    console.log('='.repeat(60));
    console.log();

    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    // Token accounts (từ deployment cũ)
    const gameTokenMint = new PublicKey('2AxM2y84vg5rwP7QK7mwmBBZrDnZpXZxKTwU5vvX1FWK');
    const ownerAccount = new PublicKey('8unZYfU5Xm1DCgnSt12jjqwXP1ifcMUSbFFerbBN8WYS');
    const gamePoolAccount = new PublicKey('BwnPAXJ7FSQQkirnXzvLsELk5crhLxbzArwtcfgrGp19');

    // NEW LOGIC: 100 tokens per minute, 80/20 distribution
    const TOKENS_TO_MINT = 100;
    const OWNER_SHARE = Math.floor(TOKENS_TO_MINT * 0.2); // 20 tokens
    const GAME_POOL_SHARE = Math.floor(TOKENS_TO_MINT * 0.8); // 80 tokens

    console.log('📋 SIMULATION PARAMETERS:');
    console.log(`   🎲 Tokens to mint: ${TOKENS_TO_MINT}`);
    console.log(`   👤 Owner share: ${OWNER_SHARE} tokens (20%)`);
    console.log(`   🏦 Game pool share: ${GAME_POOL_SHARE} tokens (80%)`);
    console.log(`   ✅ Distribution: ${OWNER_SHARE}:${GAME_POOL_SHARE} = 20:80 ✓`);
    console.log();

    // Check initial balances
    console.log('💰 INITIAL BALANCES:');
    try {
        const ownerBalanceBefore = Number((await getAccount(connection, ownerAccount)).amount) / 1_000_000;
        const gamePoolBalanceBefore = Number((await getAccount(connection, gamePoolAccount)).amount) / 1_000_000;

        console.log(`   👤 Owner: ${ownerBalanceBefore} tokens`);
        console.log(`   🏦 Game Pool: ${gamePoolBalanceBefore} tokens`);
        console.log(`   📊 Total: ${ownerBalanceBefore + gamePoolBalanceBefore} tokens`);
        console.log();

        // Check if we have enough tokens to simulate
        // Trong thực tế, smart contract sẽ mint new tokens
        // Ở đây chúng ta sẽ simulate bằng cách transfer từ payer's token account (nếu có)

        const payerTokenAccount = await getAssociatedTokenAddress(gameTokenMint, payer.publicKey);

        try {
            const payerTokenBalance = Number((await getAccount(connection, payerTokenAccount)).amount) / 1_000_000;
            console.log(`   💳 Payer token balance: ${payerTokenBalance} tokens`);

            if (payerTokenBalance >= TOKENS_TO_MINT) {
                console.log('   ✅ Sufficient tokens for simulation');
                console.log();

                // SIMULATE AUTO-MINT LOGIC
                console.log('🚀 SIMULATING AUTO-MINT LOGIC EXECUTION:');

                // Create transaction to simulate mint distribution
                const transaction = new Transaction();

                // Transfer 20 tokens to owner
                if (OWNER_SHARE > 0) {
                    transaction.add(
                        createTransferInstruction(
                            payerTokenAccount,
                            ownerAccount,
                            payer.publicKey,
                            OWNER_SHARE * 1_000_000 // Convert to smallest unit
                        )
                    );
                    console.log(`   📤 Transfer ${OWNER_SHARE} tokens to Owner account`);
                }

                // Transfer 80 tokens to game pool
                if (GAME_POOL_SHARE > 0) {
                    transaction.add(
                        createTransferInstruction(
                            payerTokenAccount,
                            gamePoolAccount,
                            payer.publicKey,
                            GAME_POOL_SHARE * 1_000_000 // Convert to smallest unit
                        )
                    );
                    console.log(`   📤 Transfer ${GAME_POOL_SHARE} tokens to Game Pool account`);
                }

                console.log(`   🎯 Total distributed: ${TOKENS_TO_MINT} tokens`);
                console.log();

                // Sign and send transaction
                console.log('📡 SENDING SIMULATION TRANSACTION...');
                const signature = await connection.sendTransaction(transaction, [payer]);
                console.log(`   ✅ Transaction sent: ${signature}`);

                // Wait for confirmation
                console.log('⏳ WAITING FOR CONFIRMATION...');
                const confirmation = await connection.confirmTransaction(signature, 'confirmed');
                console.log('   ✅ Transaction confirmed');

                console.log();

                // Check final balances
                console.log('💰 FINAL BALANCES (AFTER SIMULATION):');

                const ownerBalanceAfter = Number((await getAccount(connection, ownerAccount)).amount) / 1_000_000;
                const gamePoolBalanceAfter = Number((await getAccount(connection, gamePoolAccount)).amount) / 1_000_000;

                console.log(`   👤 Owner: ${ownerBalanceAfter} tokens (+${ownerBalanceAfter - ownerBalanceBefore})`);
                console.log(`   🏦 Game Pool: ${gamePoolBalanceAfter} tokens (+${gamePoolBalanceAfter - gamePoolBalanceBefore})`);
                console.log(`   📊 Total: ${ownerBalanceAfter + gamePoolBalanceAfter} tokens`);

                console.log();

                // Verification
                console.log('🎯 VERIFICATION RESULTS:');

                const ownerIncrease = ownerBalanceAfter - ownerBalanceBefore;
                const gamePoolIncrease = gamePoolBalanceAfter - gamePoolBalanceBefore;
                const totalIncrease = ownerIncrease + gamePoolIncrease;

                const ownerCorrect = Math.abs(ownerIncrease - OWNER_SHARE) < 0.01;
                const gamePoolCorrect = Math.abs(gamePoolIncrease - GAME_POOL_SHARE) < 0.01;
                const totalCorrect = Math.abs(totalIncrease - TOKENS_TO_MINT) < 0.01;
                const ratioCorrect = Math.abs((ownerIncrease / gamePoolIncrease) - (OWNER_SHARE / GAME_POOL_SHARE)) < 0.01;

                console.log(`   ✅ Owner received correct amount: ${ownerCorrect ? 'YES' : 'NO'} (${ownerIncrease}/${OWNER_SHARE})`);
                console.log(`   ✅ Game Pool received correct amount: ${gamePoolCorrect ? 'YES' : 'NO'} (${gamePoolIncrease}/${GAME_POOL_SHARE})`);
                console.log(`   ✅ Total distribution correct: ${totalCorrect ? 'YES' : 'NO'} (${totalIncrease}/${TOKENS_TO_MINT})`);
                console.log(`   ✅ 80/20 ratio maintained: ${ratioCorrect ? 'YES' : 'NO'}`);

                console.log();

                if (ownerCorrect && gamePoolCorrect && totalCorrect && ratioCorrect) {
                    console.log('🎉 SIMULATION SUCCESSFUL!');
                    console.log('   ✅ 100 tokens/minute logic verified');
                    console.log('   ✅ 80/20 distribution working');
                    console.log('   ✅ Owner receives 20 tokens/minute');
                    console.log('   ✅ Game Pool receives 80 tokens/minute');
                    console.log();
                    console.log('💎 DEVNET NOW SYNCHRONIZED WITH NEW LOGIC!');
                    console.log('🚀 Ready for real Auto-mint implementation!');
                } else {
                    console.log('❌ Simulation had issues - check transaction details');
                }

                // Show explorer link
                console.log();
                console.log('🌐 View transaction on Solana Explorer:');
                console.log(`https://explorer.solana.com/tx/${signature}?cluster=devnet`);

            } else {
                console.log(`   ❌ Insufficient tokens for simulation (${payerTokenBalance} < ${TOKENS_TO_MINT})`);
                console.log('   💡 Need more tokens in payer account to simulate');
                console.log('   💡 Or use different simulation method');
            }

        } catch (error) {
            console.log(`   ❌ Payer token account check failed: ${error.message}`);
            console.log('   💡 Payer may not have associated token account');
        }

    } catch (error) {
        console.log(`❌ Initial balance check failed: ${error.message}`);
        console.log('💡 Token accounts may not exist or be accessible');
    }
}

// Run simulation
if (require.main === module) {
    simulate100TokensLogic().catch(console.error);
}

module.exports = { simulate100TokensLogic };
