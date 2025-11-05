/**
 * Verify 80/20 Token Distribution on Devnet
 * Check auto-mint transactions and balances
 */

const anchor = require('@coral-xyz/anchor');
const { PublicKey } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, getAccount, getMint } = require('@solana/spl-token');
const fs = require('fs');

async function verifyDistribution() {
    console.log('🔍 Verifying 80/20 Token Distribution...');
    console.log('======================================');

    // Load configuration
    let config;
    try {
        config = JSON.parse(fs.readFileSync('./production_config.json'));
    } catch (error) {
        console.error('❌ Configuration not found. Run initialize_pdas.js first');
        return;
    }

    // Setup connection
    const connection = new anchor.web3.Connection(
        'https://api.devnet.solana.com',
        'confirmed'
    );

    // Load program
    const idl = JSON.parse(fs.readFileSync('./target/idl/game_token.json'));
    const programId = new PublicKey(config.programId);
    const program = new anchor.Program(idl, programId, {
        connection: connection
    });

    console.log('📋 Checking accounts:');
    console.log('• Program:', config.programId);
    console.log('• Game Pools:', config.gamePools);
    console.log('• Owner Wallet:', config.wallet);

    // Check game pools account
    try {
        const gamePoolsAccount = await program.account.gameTokenPools.fetch(config.gamePools);
        console.log('\n🏊 Game Pools Status:');
        console.log('• Active Pool:', gamePoolsAccount.activePool.toString(), 'tokens');
        console.log('• Reward Pool:', gamePoolsAccount.rewardPool.toString(), 'tokens');
        console.log('• Reserve Pool:', gamePoolsAccount.reservePool.toString(), 'tokens');
        console.log('• Burn Pool:', gamePoolsAccount.burnPool.toString(), 'tokens');
    } catch (error) {
        console.error('❌ Error fetching game pools:', error);
        return;
    }

    // Check minting authority
    try {
        const authorityAccount = await program.account.mintingAuthority.fetch(config.mintingAuthority);
        console.log('\n🏭 Minting Authority Status:');
        console.log('• Total Minted:', authorityAccount.totalMinted.toString(), 'tokens');
        console.log('• Is Infinite:', authorityAccount.isInfinite);
        console.log('• Max Supply:', authorityAccount.maxSupply?.toString() || 'Unlimited');
    } catch (error) {
        console.error('❌ Error fetching minting authority:', error);
        return;
    }

    // Check token balances
    try {
        console.log('\n💰 Token Balances:');

        // Game pools token account
        const gamePoolsBalance = await connection.getTokenAccountBalance(config.gamePoolsTokenAccount);
        console.log('• Game Pool Account:', gamePoolsBalance.value.uiAmount, 'tokens');

        // Owner token account
        const ownerTokenAccount = await anchor.web3.PublicKey.findProgramAddress(
            [new PublicKey(config.wallet).toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), new PublicKey(config.gameTokenMint).toBuffer()],
            new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
        );

        try {
            const ownerBalance = await connection.getTokenAccountBalance(ownerTokenAccount[0]);
            console.log('• Owner Account:', ownerBalance.value.uiAmount, 'tokens');
        } catch (error) {
            console.log('• Owner Account: 0 tokens (not created yet)');
        }

        // Mint supply
        const mintInfo = await getMint(connection, new PublicKey(config.gameTokenMint));
        console.log('• Total Supply:', Number(mintInfo.supply) / Math.pow(10, mintInfo.decimals), 'tokens');

    } catch (error) {
        console.error('❌ Error checking balances:', error);
    }

    // Check recent transactions
    console.log('\n📊 Recent Transactions:');
    try {
        const transactions = await connection.getSignaturesForAddress(new PublicKey(config.programId), { limit: 10 });

        for (const tx of transactions) {
            const txDetails = await connection.getTransaction(tx.signature);
            if (txDetails && txDetails.meta.logMessages) {
                const logs = txDetails.meta.logMessages.join(' ');
                if (logs.includes('Auto-minted')) {
                    console.log('✅ Auto-mint TX:', tx.signature);
                    console.log('   ', logs.match(/Auto-minted \d+ tokens: \d+ game \+ \d+ owner/)?.[0] || 'Details not found');
                }
            }
        }
    } catch (error) {
        console.warn('⚠️ Could not fetch recent transactions:', error.message);
    }

    // Calculate expected distribution
    console.log('\n📈 Distribution Analysis:');

    const gamePoolsBalance = await connection.getTokenAccountBalance(config.gamePoolsTokenAccount).catch(() => ({ value: { uiAmount: 0 } }));
    const gameTokens = gamePoolsBalance.value.uiAmount || 0;

    let ownerTokens = 0;
    try {
        const ownerTokenAccount = await anchor.web3.PublicKey.findProgramAddress(
            [new PublicKey(config.wallet).toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), new PublicKey(config.gameTokenMint).toBuffer()],
            new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
        );
        const ownerBalance = await connection.getTokenAccountBalance(ownerTokenAccount[0]);
        ownerTokens = ownerBalance.value.uiAmount || 0;
    } catch (error) {
        // Owner account might not exist
    }

    const totalTokens = gameTokens + ownerTokens;

    if (totalTokens > 0) {
        const expectedGameTokens = totalTokens * 0.8;
        const expectedOwnerTokens = totalTokens * 0.2;

        console.log('• Total Tokens Minted:', totalTokens);
        console.log('• Game Pool (80%):', gameTokens, `(Expected: ${expectedGameTokens})`);
        console.log('• Owner (20%):', ownerTokens, `(Expected: ${expectedOwnerTokens})`);

        const gameRatio = gameTokens / totalTokens;
        const ownerRatio = ownerTokens / totalTokens;

        console.log('• Actual Game Ratio:', (gameRatio * 100).toFixed(1) + '%');
        console.log('• Actual Owner Ratio:', (ownerRatio * 100).toFixed(1) + '%');

        if (Math.abs(gameRatio - 0.8) < 0.01 && Math.abs(ownerRatio - 0.2) < 0.01) {
            console.log('✅ Distribution: PERFECT 80/20 split!');
        } else {
            console.log('⚠️ Distribution: Deviation from 80/20 detected');
        }
    } else {
        console.log('ℹ️ No tokens minted yet. Start auto-mint scheduler to test distribution.');
    }

    // Revenue projection
    console.log('\n💰 Revenue Projection:');
    const tokensPerMinute = 100;
    const ownerTokensPerMinute = tokensPerMinute * 0.2; // 20 tokens/minute
    const tokensPerDay = ownerTokensPerMinute * 60 * 24; // 28,800 tokens/day
    const tokensPerMonth = tokensPerDay * 30; // ~864,000 tokens/month

    console.log('• Owner receives:', ownerTokensPerMinute, 'tokens/minute');
    console.log('• Daily revenue:', tokensPerDay.toLocaleString(), 'tokens');
    console.log('• Monthly revenue:', tokensPerMonth.toLocaleString(), 'tokens');

    // At different token prices
    const prices = [0.01, 0.1, 1.0];
    console.log('\n💎 Potential Monthly Revenue:');
    prices.forEach(price => {
        const revenue = tokensPerMonth * price;
        console.log(`• At $${price}/token: $${revenue.toLocaleString()}`);
    });

    console.log('\n🎯 Verification Complete!');
    console.log('🔗 Check Solana Explorer: https://explorer.solana.com/?cluster=devnet');
}

// Run if called directly
if (require.main === module) {
    verifyDistribution().catch(console.error);
}

module.exports = { verifyDistribution };
