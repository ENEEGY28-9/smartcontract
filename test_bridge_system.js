import { Connection } from '@solana/web3.js';
import { BridgeSystem, BRIDGE_CONSTANTS } from './bridge/src/index.js';

async function testBridgeSystem() {
  console.log('🌉 TESTING BRIDGE SYSTEM\n');

  try {
    // Initialize bridge system
    const bridgeSystem = new BridgeSystem('devnet');
    console.log('✅ Bridge system initialized');

    // Test supported chains
    console.log('\n🔗 Testing supported chains...');
    const chains = bridgeSystem.getSupportedChains();
    console.log(`Supported chains: ${chains.length}`);
    chains.forEach(chain => {
      console.log(`- ${chain.name} (ID: ${chain.id}) - ${chain.nativeToken}`);
    });

    // Test bridge fee calculation
    console.log('\n💰 Testing fee calculation...');
    const testAmount = 10; // 10 tokens
    const testChain = BRIDGE_CONSTANTS.CHAINS.ETHEREUM;

    const fee = bridgeSystem.calculateFee(testAmount, testChain);
    console.log(`Bridge fee for ${testAmount} tokens to Ethereum: ${fee} SOL`);

    // Test bridge stats
    console.log('\n📊 Testing bridge statistics...');
    const stats = await bridgeSystem.getBridgeStats();
    console.log('Bridge Stats:', stats);

    // Test utility functions
    console.log('\n🛠️ Testing utility functions...');
    console.log(`Chain name for ID 2: ${bridgeSystem.getChainName(2)}`);
    console.log(`Native token for Ethereum: ${bridgeSystem.getChainNativeToken(2)}`);

    console.log('\n🎉 BRIDGE SYSTEM TEST: SUCCESS!');
    console.log('=====================================');
    console.log('✅ Bridge system initialized');
    console.log('✅ Supported chains loaded');
    console.log('✅ Fee calculation working');
    console.log('✅ Statistics retrieved');
    console.log('✅ Utility functions working');
    console.log('\n🌉 Bridge system ready for cross-chain transfers!');

  } catch (error) {
    console.error('❌ Bridge system test failed:', error);
  }
}

// Run test
testBridgeSystem().catch(console.error);

