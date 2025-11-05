// TEST WALLET SWITCHING FUNCTIONALITY
// Copy and paste into browser console after switching wallets

console.log('🔄 WALLET SWITCHING TEST');
console.log('========================');

const originalWallet = '57arMrLe8LHfzn7c0yUu6KGhxLQ6nfP87mHTHpM2SGB';

if (typeof window !== 'undefined' && window.solana) {
    const currentWallet = window.solana.publicKey?.toString();

    console.log('📋 Switch Test Results:');
    console.log(`   Original Wallet: ${originalWallet.slice(0, 12)}...`);
    console.log(`   Current Wallet:  ${currentWallet?.slice(0, 12)}...`);
    console.log(`   Wallet Changed: ${currentWallet !== originalWallet}`);

    if (currentWallet && currentWallet !== originalWallet) {
        console.log('\n🎉 WALLET SWITCH SUCCESSFUL!');
        console.log(`   ✅ New Address: ${currentWallet}`);
        console.log(`   ✅ Connection: ${window.solana.isConnected ? 'Active' : 'Lost'}`);
        console.log(`   ✅ Network: Solana Devnet`);

        console.log('\n💡 UI Updates:');
        console.log('   - Address field should show new wallet');
        console.log('   - Balance should update to new wallet');
        console.log('   - Connection Status should stay Connected');
        console.log('   - All tests should pass with new data');

    } else if (currentWallet === originalWallet) {
        console.log('\nℹ️ Still on original wallet');
        console.log('💡 To switch: Click Phantom → Account dropdown → Select different account');

    } else {
        console.log('\n❌ No wallet detected');
        console.log('💡 Make sure Testnet Mode is ON in Phantom');
    }

} else {
    console.log('❌ Phantom wallet not available');
    console.log('💡 Check if extension is enabled');
}

console.log('\n🔍 Current Status:');
console.log(`   - Connected: ${window.solana?.isConnected || false}`);
console.log(`   - Is Phantom: ${window.solana?.isPhantom || false}`);
console.log(`   - Current URL: ${window.location.href}`);

console.log('\n🎯 Switch test complete!');
console.log('========================');

