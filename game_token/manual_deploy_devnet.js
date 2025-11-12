/**
 * MANUAL DEPLOY DEVNET - Alternative Deployment Method
 *
 * Deploy smart contract to devnet using direct Solana CLI calls
 */

const fs = require('fs');
const path = require('path');
const { Connection, PublicKey, Keypair, Transaction, SystemProgram } = require('@solana/web3.js');
const { execSync } = require('child_process');

async function manualDeployDevnet() {
    console.log('🚀 MANUAL DEVNET DEPLOYMENT');
    console.log('='.repeat(40));
    console.log();

    try {
        // Check if anchor is available
        console.log('🔍 Checking Anchor CLI...');
        try {
            execSync('anchor --version', { stdio: 'pipe' });
            console.log('✅ Anchor CLI available');
        } catch (error) {
            console.log('❌ Anchor CLI not found');
            console.log('💡 Install with: npm install -g @coral-xyz/anchor-cli');
            return;
        }

        console.log();

        // Check wallet
        console.log('🔑 Checking Solana wallet...');
        const keypairPath = path.join(process.env.HOME || process.env.USERPROFILE, '.config', 'solana', 'id.json');
        if (fs.existsSync(keypairPath)) {
            console.log('✅ Wallet keypair found');
        } else {
            console.log('❌ Wallet keypair not found');
            console.log('💡 Create with: solana-keygen new');
            return;
        }

        console.log();

        // Try to build
        console.log('🔨 Building smart contract...');
        try {
            const buildOutput = execSync('anchor build', {
                cwd: process.cwd(),
                stdio: 'pipe',
                encoding: 'utf8'
            });
            console.log('✅ Build successful');
        } catch (error) {
            console.log('❌ Build failed');
            console.log('Error:', error.stderr || error.message);
            console.log('💡 Check Rust/Cargo installation');
            return;
        }

        console.log();

        // Try to deploy
        console.log('🚀 Deploying to devnet...');
        try {
            const deployOutput = execSync('anchor deploy --provider.cluster devnet', {
                cwd: process.cwd(),
                stdio: 'pipe',
                encoding: 'utf8'
            });
            console.log('✅ Deployment successful!');
            console.log('Output:', deployOutput);
        } catch (error) {
            console.log('❌ Deployment failed');
            console.log('Error:', error.stderr || error.message);
            console.log('💡 Check SOL balance and network connection');
            return;
        }

        console.log();

        // Verify deployment
        console.log('🔍 Verifying deployment...');
        const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
        const programId = new PublicKey('Do9Bq3c7rSSU4YW32F3mCZekQZo5jdyaBuayqmNGAeTe');

        const programAccount = await connection.getAccountInfo(programId);
        if (programAccount) {
            console.log('✅ Smart contract verified on devnet');
            console.log(`📊 Program size: ${programAccount.data.length} bytes`);
        } else {
            console.log('❌ Smart contract not found after deployment');
        }

        console.log();

        // Next steps
        console.log('🎯 NEXT STEPS:');
        console.log('   1. 🔧 Initialize PDAs');
        console.log('   2. 🧪 Test new logic (100 tokens/minute)');
        console.log('   3. 📊 Verify 80/20 distribution');
        console.log('   4. 🎉 Complete devnet synchronization!');

    } catch (error) {
        console.log('❌ Manual deployment failed:', error.message);
    }
}

// Alternative: Direct deploy using solana CLI
async function alternativeDeploy() {
    console.log('🔄 ALTERNATIVE DEPLOYMENT METHOD');
    console.log('Using solana CLI directly...');

    try {
        // Check solana CLI
        execSync('solana --version', { stdio: 'pipe' });
        console.log('✅ Solana CLI available');

        // Check program keypair
        const programKeypairPath = './target/deploy/game_token-keypair.json';
        if (fs.existsSync(programKeypairPath)) {
            console.log('✅ Program keypair exists');

            // Deploy using solana CLI
            console.log('🚀 Deploying with solana CLI...');
            const deployCmd = `solana program deploy --keypair ${programKeypairPath} --url https://api.devnet.solana.com target/deploy/game_token.so`;

            try {
                const result = execSync(deployCmd, {
                    cwd: process.cwd(),
                    stdio: 'pipe',
                    encoding: 'utf8'
                });
                console.log('✅ Alternative deployment successful!');
                console.log('Output:', result);
            } catch (error) {
                console.log('❌ Alternative deployment failed');
                console.log('Error:', error.stderr || error.message);
            }

        } else {
            console.log('❌ Program keypair not found');
            console.log('💡 Build the program first');
        }

    } catch (error) {
        console.log('❌ Solana CLI not available');
        console.log('💡 Install Solana CLI tools');
    }
}

// Run deployment
async function main() {
    console.log('Choose deployment method:');
    console.log('1. Anchor CLI (recommended)');
    console.log('2. Solana CLI (alternative)');
    console.log();

    // Try Anchor first
    await manualDeployDevnet();

    console.log();
    console.log('If Anchor failed, trying alternative method...');
    console.log();

    // If Anchor fails, try alternative
    await alternativeDeploy();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { manualDeployDevnet, alternativeDeploy };









