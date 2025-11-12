const { Connection } = require('@solana/web3.js');

// List of alternative Solana RPC endpoints to test
const RPC_ENDPOINTS = [
    'https://api.devnet.solana.com',
    'https://devnet.helius-rpc.com/?api-key=demo',
    'https://solana-devnet.g.alchemy.com/v2/demo',
    'https://devnet.solana-rpc.com',
    'https://devnet.rpcpool.com',
    'https://api.devnet-beta.solana.com',
];

async function testRpcEndpoint(rpcUrl, timeout = 10000) {
    console.log(`\n🧪 Testing RPC: ${rpcUrl}`);

    try {
        const connection = new Connection(rpcUrl, {
            commitment: 'confirmed',
            confirmTransactionInitialTimeout: timeout
        });

        // Test 1: Get version
        console.log('   📡 Getting version...');
        const version = await connection.getVersion();
        console.log(`   ✅ Version: ${version['solana-core']}`);

        // Test 2: Get recent blockhash
        console.log('   🔗 Getting recent blockhash...');
        const { blockhash } = await connection.getLatestBlockhash();
        console.log(`   ✅ Blockhash: ${blockhash.substring(0, 16)}...`);

        // Test 3: Get slot
        console.log('   📊 Getting current slot...');
        const slot = await connection.getSlot();
        console.log(`   ✅ Current slot: ${slot}`);

        console.log(`   🎉 RPC ${rpcUrl} is WORKING!`);
        return { url: rpcUrl, working: true, version: version['solana-core'], slot };

    } catch (error) {
        console.log(`   ❌ RPC ${rpcUrl} FAILED: ${error.message}`);
        return { url: rpcUrl, working: false, error: error.message };
    }
}

async function testAllEndpoints() {
    console.log('🚀 TESTING SOLANA DEVNET RPC CONNECTIVITY');
    console.log('='.repeat(60));

    const results = [];

    for (const rpcUrl of RPC_ENDPOINTS) {
        const result = await testRpcEndpoint(rpcUrl);
        results.push(result);

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n📊 SUMMARY RESULTS:');
    console.log('='.repeat(60));

    const working = results.filter(r => r.working);
    const failed = results.filter(r => !r.working);

    console.log(`✅ Working RPCs: ${working.length}`);
    console.log(`❌ Failed RPCs: ${failed.length}`);

    if (working.length > 0) {
        console.log('\n🎯 RECOMMENDED RPC ENDPOINTS:');
        working.forEach((result, index) => {
            console.log(`${index + 1}. ${result.url}`);
            console.log(`   Version: ${result.version}, Slot: ${result.slot}`);
        });

        console.log('\n💡 TO USE ALTERNATIVE RPC:');
        console.log('   Update your scripts to use one of these working endpoints');
        console.log('   Example: const connection = new Connection("' + working[0].url + '", "confirmed");');

    } else {
        console.log('\n❌ No working RPC endpoints found!');
        console.log('💡 POSSIBLE SOLUTIONS:');
        console.log('   1. Check your internet connection');
        console.log('   2. Try using a VPN');
        console.log('   3. Wait a few minutes and try again');
        console.log('   4. Use a local Solana validator');
    }

    return working;
}

// Test current connection
async function testCurrentConnection() {
    console.log('🔍 Testing current default connection...');
    return await testRpcEndpoint('https://api.devnet.solana.com');
}

// Run tests
async function main() {
    console.log('⏳ Testing current connection first...\n');

    const currentResult = await testCurrentConnection();

    if (currentResult.working) {
        console.log('\n✅ Current RPC is working! No need to change.');
        return;
    }

    console.log('\n🔄 Current RPC failed, testing alternatives...\n');
    const workingEndpoints = await testAllEndpoints();

    if (workingEndpoints.length > 0) {
        console.log('\n📝 RECOMMENDED FIX:');
        console.log('   Update player_claim_real.js line 18:');
        console.log(`   const connection = new Connection('${workingEndpoints[0].url}', 'confirmed');`);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { testRpcEndpoint, testAllEndpoints };


