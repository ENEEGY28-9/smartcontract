// DISPLAY CURRENT WALLET INFORMATION
// Copy and paste into browser console

console.log('💼 CURRENT PHANTOM WALLET INFO');
console.log('==============================');

if (typeof window !== 'undefined' && window.solana) {
    console.log('📋 Wallet Status:');
    console.log(`   Connected: ${window.solana.isConnected}`);
    console.log(`   Is Phantom: ${window.solana.isPhantom}`);
    console.log(`   Public Key: ${window.solana.publicKey?.toString()}`);

    if (window.solana.publicKey) {
        const address = window.solana.publicKey.toString();
        console.log('\n🔍 Address Details:');
        console.log(`   Full Address: ${address}`);
        console.log(`   Short Form: ${address.slice(0, 8)}...${address.slice(-8)}`);
        console.log(`   Length: ${address.length} characters`);
        console.log(`   Network: Solana ${window.solana.isConnected ? 'Devnet' : 'Unknown'}`);
    }

    console.log('\n🛠️ Available Methods:');
    const methods = Object.getOwnPropertyNames(window.solana);
    methods.forEach(method => {
        console.log(`   - ${method}`);
    });

    console.log('\n💡 TO SWITCH WALLETS:');
    console.log('   1. Click Phantom extension (fox icon in toolbar)');
    console.log('   2. Click account dropdown (top of Phantom window)');
    console.log('   3. Select different account or "Create New Account"');
    console.log('   4. Refresh browser page (Ctrl+F5)');
    console.log('   5. Address will update automatically');

    console.log('\n🎯 After switching:');
    console.log('   - Address field will show new public key');
    console.log('   - Balance will update to new wallet');
    console.log('   - Connection Status stays Connected');
    console.log('   - All tests will re-run with new data');

} else {
    console.log('❌ Phantom wallet not detected');
    console.log('💡 Make sure Testnet Mode is ON in Phantom settings');
}

console.log('\n🌐 Current URL:', window.location.href);
console.log('==============================');

