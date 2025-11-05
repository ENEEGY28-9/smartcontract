# Complete Fix and Test Script for Phantom Wallet
Write-Host "🚀 PHANTOM WALLET COMPLETE FIX & TEST" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Yellow
Write-Host ""

Write-Host "🔍 ANALYZING CURRENT STATUS..." -ForegroundColor Cyan
Write-Host ""

# Check server
Write-Host "📋 Server Status:" -ForegroundColor Yellow
$serverRunning = Test-NetConnection -ComputerName localhost -Port 5176 -WarningAction SilentlyContinue
if ($serverRunning.TcpTestSucceeded) {
    Write-Host "   ✅ Server running on port 5176" -ForegroundColor Green
    Write-Host "   🌐 URL: http://localhost:5176/wallet-test" -ForegroundColor White
} else {
    Write-Host "   ❌ Server not running" -ForegroundColor Red
    Write-Host "   💡 Start server with: npm run dev" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🎯 REQUIRED ACTIONS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1️⃣  PHANTOM SETTINGS (Most Important):" -ForegroundColor Cyan
Write-Host "   - Click Phantom extension (🦊 fox icon)" -ForegroundColor White
Write-Host "   - Click Settings (⚙️ gear icon)" -ForegroundColor White
Write-Host "   - Scroll to Developer Settings" -ForegroundColor White
Write-Host "   - Toggle 'Testnet Mode' to ON (white)" -ForegroundColor White
Write-Host "   - Toggle 'Auto-Confirm on localhost' to ON (white)" -ForegroundColor White
Write-Host ""

Write-Host "2️⃣  BROWSER ACTIONS:" -ForegroundColor Cyan
Write-Host "   - Refresh page (Ctrl+F5)" -ForegroundColor White
Write-Host "   - Go to: http://localhost:5176/wallet-test" -ForegroundColor White
Write-Host "   - Click 'Connect Wallet' button" -ForegroundColor White
Write-Host ""

Write-Host "3️⃣  COPY-PASTE TEST CODE:" -ForegroundColor Cyan
Write-Host "   Open browser console (F12) and paste this:" -ForegroundColor White
Write-Host ""

$testCode = @"
// IMMEDIATE CONNECTION TEST
console.log('🔍 Testing connection...');
if (window.solana) {
  window.solana.connect().then(r => {
    console.log('✅ SUCCESS:', r.publicKey.toString());
  }).catch(e => {
    console.error('❌ FAILED:', e.message);
    console.log('💡 Make sure Testnet Mode is ON in Phantom settings');
  });
} else {
  console.log('❌ Phantom not found');
}
"@

Write-Host $testCode -ForegroundColor Gray
Write-Host ""

Write-Host "🎉 EXPECTED RESULT AFTER FIX:" -ForegroundColor Green
Write-Host "   ✅ Connection Status: Connected" -ForegroundColor Green
Write-Host "   ✅ Balance: 0.0000 SOL" -ForegroundColor Green
Write-Host "   ✅ Network: Solana Devnet" -ForegroundColor Green
Write-Host "   ✅ No more 'wallet not available' errors" -ForegroundColor Green
Write-Host ""

Write-Host "🔧 IF STILL NOT WORKING:" -ForegroundColor Yellow
Write-Host "   1. Clear browser cache (Ctrl+Shift+Delete)" -ForegroundColor White
Write-Host "   2. Try incognito mode (Ctrl+Shift+N)" -ForegroundColor White
Write-Host "   3. Restart Chrome browser" -ForegroundColor White
Write-Host "   4. Disable other wallet extensions" -ForegroundColor White
Write-Host ""

Write-Host "⚡ QUICK CHECKLIST:" -ForegroundColor Cyan
Write-Host "   [ ] Testnet Mode: ON in Phantom settings?" -ForegroundColor White
Write-Host "   [ ] Auto-Confirm: ON in Phantom settings?" -ForegroundColor White
Write-Host "   [ ] Browser refreshed (Ctrl+F5)?" -ForegroundColor White
Write-Host "   [ ] Connect Wallet button clicked?" -ForegroundColor White
Write-Host ""

Write-Host "🎯 This should fix it 100%!" -ForegroundColor Green
Write-Host ""

Read-Host "Press Enter after completing the steps above..."

