const { Connection, PublicKey } = require('@solana/web3.js');

async function checkProgramDeployment() {
    console.log('🔍 CHECKING PROGRAM DEPLOYMENT ON DEVNET');
    console.log('='.repeat(60));

    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    const programId = new PublicKey('DdhUfxGFwmaHrz5WsJ2jXM5Xts14ctytBvaQ8QoyqgGq');

    console.log(`📄 Program ID: ${programId.toString()}`);

    try {
        // Check if program account exists
        console.log('\n🔎 Checking if program account exists...');
        const programAccount = await connection.getAccountInfo(programId);

        if (programAccount === null) {
            console.log('❌ Program account does not exist on devnet!');
            console.log('💡 This means the deployment failed or was not completed.');

            // Check balance of program ID (should be rent-exempt if deployed)
            console.log('\n💰 Checking program account balance...');
            const balance = await connection.getBalance(programId);
            console.log(`Balance: ${balance / 1e9} SOL`);

            if (balance === 0) {
                console.log('❌ Program account has 0 SOL - definitely not deployed');
            }

            return false;
        }

        console.log('✅ Program account exists!');

        // Check if it's executable
        if (!programAccount.executable) {
            console.log('❌ Program account is not executable!');
            return false;
        }

        console.log('✅ Program is executable');

        // Get program size
        console.log(`📏 Program size: ${programAccount.data.length} bytes`);
        console.log(`🏠 Owner: ${programAccount.owner.toString()}`);

        // Check recent slot
        const slot = await connection.getSlot();
        console.log(`📊 Current slot: ${slot}`);

        console.log('\n🎉 PROGRAM IS SUCCESSFULLY DEPLOYED ON DEVNET!');
        return true;

    } catch (error) {
        console.log('❌ Error checking program:', error.message);
        return false;
    }
}

// Also check the alternative program ID from mock deployment
async function checkAlternativeProgramId() {
    console.log('\n🔍 CHECKING ALTERNATIVE PROGRAM ID');
    console.log('='.repeat(60));

    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    // From mock_deployment.json
    const altProgramId = new PublicKey('DdhUfxGFwmaHrz5WsJ2jXM5Xts14ctytBvaQ8QoyqgGq');

    console.log(`📄 Alternative Program ID: ${altProgramId.toString()}`);

    try {
        const programAccount = await connection.getAccountInfo(altProgramId);

        if (programAccount === null) {
            console.log('❌ Alternative program ID also does not exist');
            return false;
        }

        console.log('✅ Alternative program ID exists!');
        console.log('💡 This might be the correct program ID to use');
        return true;

    } catch (error) {
        console.log('❌ Error checking alternative program:', error.message);
        return false;
    }
}

async function main() {
    const isDeployed = await checkProgramDeployment();
    await checkAlternativeProgramId();

    console.log('\n📋 DEPLOYMENT STATUS SUMMARY:');
    console.log('='.repeat(60));

    if (isDeployed) {
        console.log('✅ Smart contract is deployed and ready for testing');
        console.log('🚀 You can now test player claims!');
    } else {
        console.log('❌ Smart contract is NOT deployed on devnet');
        console.log('🔧 SOLUTION: Redeploy the smart contract');
        console.log('   Run: wsl bash wsl_build.sh');
        console.log('   Or manually: anchor build && anchor deploy --provider.cluster devnet');
    }
}

if (require.main === module) {
    main().catch(console.error);
}
