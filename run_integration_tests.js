#!/usr/bin/env node

// Integration Test Runner for Eneegy Project
// This script runs comprehensive integration tests for the full stack

import { runFullIntegrationTest } from './test_integration_full.js';

async function main() {
    console.log('🚀 Eneegy Integration Test Suite');
    console.log('================================\n');

    console.log('📋 Test Coverage:');
    console.log('  ✅ Real Ed25519 Derivation');
    console.log('  ✅ BIP39 Mnemonic Support');
    console.log('  ✅ HD Wallet (BIP32/BIP44)');
    console.log('  ✅ Wallet Recovery');
    console.log('  ✅ User Lifecycle');
    console.log('  ✅ Token Operations');
    console.log('  ✅ Concurrent Load Testing');
    console.log('  ✅ Error Scenario Testing');
    console.log('  ✅ Performance Analysis\n');

    console.log('🔧 Prerequisites:');
    console.log('  - PocketBase running on port 8090');
    console.log('  - Gateway running on port 8080');
    console.log('  - Redis running for caching\n');

    try {
        console.log('▶️  Starting integration tests...\n');

        const success = await runFullIntegrationTest();

        console.log('\n' + '='.repeat(60));

        if (success) {
            console.log('🎉 ALL INTEGRATION TESTS PASSED!');
            console.log('✨ System is ready for production deployment');
            process.exit(0);
        } else {
            console.log('❌ INTEGRATION TESTS FAILED!');
            console.log('🔧 Please check the errors above and fix issues');
            process.exit(1);
        }

    } catch (error) {
        console.error('💥 Test runner failed:', error);
        process.exit(1);
    }
}

main();










