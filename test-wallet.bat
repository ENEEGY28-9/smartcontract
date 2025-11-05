@echo off
echo 🔍 Checking wallet balance in PocketBase...
echo.

REM Check PocketBase health
echo Checking PocketBase status...
curl -s http://localhost:8090/api/health > health.json
if %errorlevel% neq 0 (
    echo ❌ PocketBase is not running!
    echo 💡 Start PocketBase: npm run pocketbase
    goto :end
)

REM Parse health status
powershell -Command "$health = Get-Content 'health.json' | ConvertFrom-Json; Write-Host '✅ PocketBase Status:' $health.status"
if %errorlevel% neq 0 (
    echo ❌ Cannot connect to PocketBase
    echo 💡 Make sure PocketBase is running on port 8090
    goto :end
)

echo.

REM Get wallets data
echo Getting wallet data...
curl -s "http://localhost:8090/api/collections/wallets/records?perPage=100" > wallets.json

REM Check if we got data
powershell -Command "$data = Get-Content 'wallets.json' | ConvertFrom-Json; if ($data.totalItems -eq $null) { exit 1 }"
if %errorlevel% neq 0 (
    echo ❌ No wallet data found in database!
    echo.
    echo 💡 Instructions to create wallet:
    echo    1. Open http://localhost:5173/wallet-test
    echo    2. Login with test account (demo@example.com / demo123456)
    echo    3. Click "Create New Wallet" or "Connect Wallet"
    echo    4. Balance will be fetched from blockchain and saved to DB
    goto :cleanup
)

REM Parse and display wallet data
echo 📊 Wallet Summary:
powershell -Command "
$data = Get-Content 'wallets.json' | ConvertFrom-Json;
Write-Host 'Total wallets:' $data.totalItems;
Write-Host 'Current records:' $data.items.Count;
$totalBalance = 0;
$connectedWallets = 0;
$networkStats = @{};

foreach ($wallet in $data.items) {
    $balance = if ($wallet.balance -ne $null) { [double]$wallet.balance } else { 0 }
    $totalBalance += $balance
    if ($wallet.is_connected) { $connectedWallets++ }

    if (-not $networkStats.ContainsKey($wallet.network)) {
        $networkStats[$wallet.network] = @{ count = 0; balance = 0; connected = 0 }
    }
    $networkStats[$wallet.network].count++
    $networkStats[$wallet.network].balance += $balance
    if ($wallet.is_connected) {
        $networkStats[$wallet.network].connected++
    }
}

Write-Host 'Total balance:' $totalBalance;
Write-Host 'Connected wallets:' $connectedWallets '/' $data.items.Count;

Write-Host '';
Write-Host 'By Network:';
foreach ($network in $networkStats.Keys) {
    $stats = $networkStats[$network]
    Write-Host '  ' $network.ToUpper() ': ' $stats.count 'wallets, ' $stats.connected 'connected, Balance: ' $stats.balance
}

if ($totalBalance -eq 0) {
    Write-Host '';
    Write-Host '💡 No balance found? Please:';
    Write-Host '   1. Open http://localhost:5173/wallet-test';
    Write-Host '   2. Login with test account';
    Write-Host '   3. Connect wallet or create new wallet';
    Write-Host '   4. Balance will be fetched and saved to DB';
}
"

echo.
echo ✅ Check completed!

:cleanup
REM Clean up temp files
if exist health.json del health.json
if exist wallets.json del wallets.json

:end
echo.
pause








