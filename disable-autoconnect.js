// TEMPORARILY DISABLE AUTO-CONNECT TO STOP CONSOLE SPAM
// Copy and paste this into browser console

console.log('🔧 Disabling auto-connect to stop console spam...');

// Disable the auto-connect interval
if (window.autoConnectInterval) {
    clearInterval(window.autoConnectInterval);
    console.log('✅ Auto-connect disabled');
} else {
    console.log('ℹ️ No auto-connect interval found');
}

// Also disable the wallet store auto-connect
if (window.walletStoreAutoConnect) {
    clearTimeout(window.walletStoreAutoConnect);
    console.log('✅ Wallet store auto-connect disabled');
} else {
    console.log('ℹ️ No wallet store auto-connect found');
}

console.log('💡 Now try manual connection by clicking the Connect Wallet button');
console.log('🌐 Current URL:', window.location.href);

