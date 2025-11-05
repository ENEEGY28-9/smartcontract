// Verify Phantom Settings After Changes
console.log('🔍 VERIFY PHANTOM SETTINGS');
console.log('===========================');

if (typeof window === 'undefined') {
    console.log('❌ Not in browser environment');
    console.log('💡 Open browser console at: http://localhost:5176/wallet-test');
    return;
}

console.log('📋 Current Settings Check:');
console.log(`   URL: ${window.location.href}`);
console.log(`   Time: ${new Date().toLocaleTimeString()}`);

console.log('\n🔍 Phantom Wallet Status:');
if (window.solana) {
    console.log('   ✅ Phantom detected');
    console.log(`      - Connected: ${window.solana.isConnected}`);
    console.log(`      - Network: ${window.solana.isConnected ? 'Should show Devnet' : 'Not connected yet'}`);

    // Check if we can access Phantom's internal state
    if (window.solana.publicKey) {
        console.log(`      - Public Key: ${window.solana.publicKey.toString().slice(0, 8)}...`);
    }

    // Try to determine current network
    console.log('\n🌐 Network Detection:');
    console.log('   💡 Check Phantom extension directly to see:');
    console.log('      - Top of extension should show "Devnet"');
    console.log('      - Balance should be 0 SOL (normal for devnet)');
    console.log('      - Should show testnet badge');

} else {
    console.log('   ❌ Phantom not detected');
    console.log('   💡 Make sure Testnet Mode is ON in Phantom settings');
}

console.log('\n💡 NEXT STEPS:');
console.log('   1. Refresh this page');
console.log('   2. Click "Connect Wallet" button');
console.log('   3. Should work now if Testnet Mode is ON');

console.log('\n🔧 If still not working:');
console.log('   1. Close and reopen Phantom extension');
console.log('   2. Clear browser cache');
console.log('   3. Try incognito mode');
console.log('   4. Make sure no other wallet extensions are active');

console.log('\n✅ Expected Result After Fix:');
console.log('   - Connection Status: Connected');
console.log('   - Network: Solana Devnet');
console.log('   - Balance: 0.0000 SOL');
console.log('   - No connection errors');

console.log('\n🌐 Test URL: http://localhost:5176/wallet-test');
console.log('===========================');

