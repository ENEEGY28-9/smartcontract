const { Connection, PublicKey, Keypair, BpfLoader, SystemProgram, Transaction, sendAndConfirmTransaction, BPF_LOADER_PROGRAM_ID } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

// Load wallet
const keypairPath = path.join(process.env.HOME || process.env.USERPROFILE, '.config', 'solana', 'id.json');
const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
const payer = Keypair.fromSecretKey(new Uint8Array(keypairData));

async function deployWithJS() {
    console.log('🚀 DEPLOYING SMART CONTRACT WITH JAVASCRIPT');
    console.log('='.repeat(60));

    // Connect to devnet
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    console.log('💰 Payer:', payer.publicKey.toString());

    // Check balance
    const balance = await connection.getBalance(payer.publicKey);
    console.log('💰 Balance:', balance / 1e9, 'SOL');

    // Load program binary
    const programPath = path.join(__dirname, 'target', 'deploy', 'game_token.so');
    const programBinary = fs.readFileSync(programPath);
    console.log('📄 Program binary size:', programBinary.length, 'bytes');

    // Get program ID from keypair
    const programKeypairPath = path.join(__dirname, 'target', 'deploy', 'game_token-keypair.json');
    const programKeypairData = JSON.parse(fs.readFileSync(programKeypairPath, 'utf8'));
    const programKeypair = Keypair.fromSecretKey(new Uint8Array(programKeypairData));
    const programId = programKeypair.publicKey;

    console.log('📄 Program ID:', programId.toString());

    try {
        // Calculate minimum balance for rent exemption
        const programAccountLen = programBinary.length;
        const lamports = await connection.getMinimumBalanceForRentExemption(programAccountLen);
        console.log('💰 Required lamports for rent exemption:', lamports);

        // Deploy program manually
        console.log('📤 Deploying program manually...');

        // Create program account
        const createAccountIx = SystemProgram.createAccount({
            fromPubkey: payer.publicKey,
            newAccountPubkey: programId,
            lamports: lamports,
            space: programAccountLen,
            programId: BPF_LOADER_PROGRAM_ID,
        });

        // Load program data
        const loadInstructions = await BpfLoader.load(connection, payer, programId, programBinary);

        // Create transaction
        const transaction = new Transaction();
        transaction.add(createAccountIx);
        loadInstructions.forEach(ix => transaction.add(ix));

        // Set transaction details
        transaction.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
        transaction.feePayer = payer.publicKey;

        console.log('🚀 Sending deployment transaction...');
        const signature = await sendAndConfirmTransaction(connection, transaction, [payer, programKeypair]);

        const deployResult = { signature };

        console.log('✅ DEPLOYMENT SUCCESSFUL!');
        console.log('🔗 Transaction signature:', deployResult.signature);
        console.log('📄 Program ID:', programId.toString());

        // Verify deployment
        console.log('🔍 Verifying deployment...');
        const accountInfo = await connection.getAccountInfo(programId);
        if (accountInfo && accountInfo.executable) {
            console.log('✅ Program is deployed and executable!');
            console.log('📏 Program size:', accountInfo.data.length, 'bytes');
        } else {
            console.log('❌ Program verification failed');
        }

        return {
            success: true,
            programId: programId.toString(),
            signature
        };

    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        console.error('Error details:', error);

        return {
            success: false,
            error: error.message
        };
    }
}

// Run if called directly
if (require.main === module) {
    deployWithJS().then(result => {
        if (result.success) {
            console.log('\n🎉 SMART CONTRACT SUCCESSFULLY DEPLOYED!');
            console.log('📄 Program ID:', result.programId);
            console.log('🔗 Transaction:', result.signature);

            console.log('\n🚀 NEXT: Test player claims');
            console.log('node player_claim_real.js [player_address] [amount]');
        } else {
            console.log('\n❌ DEPLOYMENT FAILED');
            console.log('Error:', result.error);
        }
    }).catch(console.error);
}

module.exports = { deployWithJS };