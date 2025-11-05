# Phantom Wallet Connection Test Script
Write-Host "🚀 PHANTOM WALLET CONNECTION TEST" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Yellow
Write-Host ""

Write-Host "🔍 Checking current status..." -ForegroundColor Cyan

# Check if server is running
Write-Host "📋 Server Status:" -ForegroundColor Yellow
$serverRunning = Test-NetConnection -ComputerName localhost -Port 5176 -WarningAction SilentlyContinue
if ($serverRunning.TcpTestSucceeded) {
    Write-Host "   ✅ Server running on port 5176" -ForegroundColor Green
    Write-Host "   🌐 URL: http://localhost:5176/wallet-test" -ForegroundColor White
} else {
    Write-Host "   ❌ Server not running on port 5176" -ForegroundColor Red
    Write-Host "   💡 Start server with: npm run dev" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🎯 NEXT STEPS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1️⃣  Enable Testnet Mode in Phantom:" -ForegroundColor Cyan
Write-Host "   - Click Phantom extension (fox icon)" -ForegroundColor White
Write-Host "   - Click Settings (gear icon)" -ForegroundColor White
Write-Host "   - Scroll to Developer Settings" -ForegroundColor White
Write-Host "   - Toggle 'Testnet Mode' to ON" -ForegroundColor White
Write-Host "   - Toggle 'Auto-Confirm on localhost' to ON" -ForegroundColor White
Write-Host ""

Write-Host "2️⃣  After changing settings:" -ForegroundColor Cyan
Write-Host "   - Refresh browser (Ctrl+F5)" -ForegroundColor White
Write-Host "   - Go to: http://localhost:5176/wallet-test" -ForegroundColor White
Write-Host "   - Click 'Connect Wallet' button" -ForegroundColor White
Write-Host ""

Write-Host "3️⃣  Expected result:" -ForegroundColor Cyan
Write-Host "   ✅ Connection Status: Connected" -ForegroundColor Green
Write-Host "   ✅ No more 'wallet not available' errors" -ForegroundColor Green
Write-Host "   ✅ Balance: 0.0000 SOL" -ForegroundColor Green
Write-Host ""

Write-Host "🔧 Testing Script:" -ForegroundColor Yellow
Write-Host "   Copy and paste this into browser console (F12):" -ForegroundColor Gray
Write-Host ""
Write-Host "// Quick Connection Test" -ForegroundColor Gray
Write-Host "console.log('🔍 Testing connection...');" -ForegroundColor Gray
Write-Host "if (window.solana) {" -ForegroundColor Gray
Write-Host "  window.solana.connect().then(r => {" -ForegroundColor Gray
Write-Host "    console.log('✅ SUCCESS:', r.publicKey.toString());" -ForegroundColor Gray
Write-Host "  }).catch(e => {" -ForegroundColor Gray
Write-Host "    console.error('❌ FAILED:', e.message);" -ForegroundColor Gray
Write-Host "  });" -ForegroundColor Gray
Write-Host "} else {" -ForegroundColor Gray
Write-Host "  console.log('❌ Phantom not found');" -ForegroundColor Gray
Write-Host "}" -ForegroundColor Gray

Write-Host ""
Write-Host "⚡ This should fix the issue immediately!" -ForegroundColor Green
Write-Host ""

Read-Host "Press Enter to continue..."

