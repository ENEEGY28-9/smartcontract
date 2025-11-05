# PowerShell script to test wallet balance in PocketBase
Write-Host "🔍 Checking wallet balance in PocketBase..." -ForegroundColor Cyan

try {
    # Check PocketBase health
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:8090/api/health" -Method GET
    $health = $healthResponse.Content | ConvertFrom-Json
    Write-Host "✅ PocketBase Status: $($health.status)" -ForegroundColor Green

    # Get wallets list
    $walletsResponse = Invoke-WebRequest -Uri "http://localhost:8090/api/collections/wallets/records?perPage=100" -Method GET
    $wallets = $walletsResponse.Content | ConvertFrom-Json

    Write-Host "`n📊 Total wallets: $($wallets.totalItems)" -ForegroundColor Blue
    Write-Host "📋 Current records: $($wallets.items.Count)" -ForegroundColor Blue

    if ($wallets.items.Count -eq 0) {
        Write-Host "`n❌ No wallets found in database!" -ForegroundColor Red
        Write-Host "`n💡 Instructions to create wallet:" -ForegroundColor Yellow
        Write-Host "   1. Open http://localhost:5173/wallet-test" -ForegroundColor White
        Write-Host "   2. Login with test account (demo@example.com / demo123456)" -ForegroundColor White
        Write-Host "   3. Click 'Create New Wallet' or 'Connect Wallet'" -ForegroundColor White
        Write-Host "   4. Balance will be fetched from blockchain and saved to DB" -ForegroundColor White
        exit
    }

    $totalBalance = 0
    $connectedWallets = 0
    $networkStats = @{}

    Write-Host "`n📋 Wallet details:" -ForegroundColor Blue
    Write-Host ("=" * 60) -ForegroundColor Gray

    for ($i = 0; $i -lt $wallets.items.Count; $i++) {
        $wallet = $wallets.items[$i]

        Write-Host "`n$($i + 1). Wallet ID: $($wallet.id)" -ForegroundColor White
        Write-Host "   User ID: $($wallet.user_id)" -ForegroundColor Gray
        Write-Host "   Address: $($wallet.address)" -ForegroundColor Yellow
        Write-Host "   Network: $($wallet.network)" -ForegroundColor Cyan
        Write-Host "   Type: $($wallet.wallet_type)" -ForegroundColor Cyan

        $balance = if ($wallet.balance -ne $null) { [double]$wallet.balance } else { 0 }
        Write-Host "   Balance: $balance $($wallet.network.ToUpper())" -ForegroundColor Green
        Write-Host "   Balance Last Updated: $($wallet.balance_last_updated)" -ForegroundColor Gray
        $connectedText = if ($wallet.is_connected) { '✅ Yes' } else { '❌ No' }
        $connectedColor = if ($wallet.is_connected) { 'Green' } else { 'Red' }
        Write-Host "   Is Connected: $connectedText" -ForegroundColor $connectedColor
        Write-Host "   Created: $(Get-Date $wallet.created -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
        Write-Host "   Updated: $(Get-Date $wallet.updated -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray

        if ($wallet.private_key) {
            Write-Host "   Private Key: ***ENCRYPTED***" -ForegroundColor Magenta
        }
        if ($wallet.mnemonic) {
            Write-Host "   Mnemonic: ***ENCRYPTED***" -ForegroundColor Magenta
        }
        if ($wallet.notes) {
            Write-Host "   Notes: $($wallet.notes)" -ForegroundColor Gray
        }

        Write-Host ("-" * 50) -ForegroundColor Gray

        # Calculate statistics
        $totalBalance += $balance
        if ($wallet.is_connected) {
            $connectedWallets++
        }

        # Network statistics
        if (-not $networkStats.ContainsKey($wallet.network)) {
            $networkStats[$wallet.network] = @{ count = 0; balance = 0; connected = 0 }
        }
        $networkStats[$wallet.network].count++
        $networkStats[$wallet.network].balance += $balance
        if ($wallet.is_connected) {
            $networkStats[$wallet.network].connected++
        }
    }

    # Display statistics
    Write-Host "`n📈 SUMMARY:" -ForegroundColor Blue
    Write-Host "   Total balance: $totalBalance" -ForegroundColor Green
    Write-Host "   Wallets with balance: $(($wallets.items | Where-Object { $_.balance -and [double]$_.balance -gt 0 }).Count)/$($wallets.items.Count)" -ForegroundColor Yellow
    Write-Host "   Connected wallets: $connectedWallets/$($wallets.items.Count)" -ForegroundColor Yellow

    Write-Host "`n🌐 By Network:" -ForegroundColor Blue
    foreach ($network in $networkStats.Keys) {
        $stats = $networkStats[$network]
        Write-Host "   $($network.ToUpper()): $($stats.count) wallets, $($stats.connected) connected, Balance: $($stats.balance)" -ForegroundColor Cyan
    }

    # Check users
    Write-Host "`n👥 Users:" -ForegroundColor Blue
    try {
        $usersResponse = Invoke-WebRequest -Uri "http://localhost:8090/api/collections/users/records?perPage=100" -Method GET
        $users = $usersResponse.Content | ConvertFrom-Json
        Write-Host "   Total users: $($users.totalItems)" -ForegroundColor Green

        for ($i = 0; $i -lt $users.items.Count; $i++) {
            $user = $users.items[$i]
            Write-Host "   $($i + 1). $($user.email) ($($user.name)) - ID: $($user.id)" -ForegroundColor White
        }
    }
    catch {
        Write-Host "   ⚠️  Could not fetch users info (may need authentication)" -ForegroundColor Yellow
    }

    Write-Host "`n✅ Check completed!" -ForegroundColor Green

    if ($totalBalance -eq 0) {
        Write-Host "`n💡 No balance found? Please follow these steps:" -ForegroundColor Yellow
        Write-Host "   1. Open http://localhost:5173/wallet-test" -ForegroundColor White
        Write-Host "   2. Login with test account" -ForegroundColor White
        Write-Host "   3. Connect wallet (MetaMask/Phantom) or create new wallet" -ForegroundColor White
        Write-Host "   4. Balance will be fetched from blockchain and saved to DB" -ForegroundColor White
    }

}
catch {
    Write-Host "`n❌ Error checking PocketBase:" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red

    Write-Host "`n💡 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "   1. Ensure PocketBase is running: npm run pocketbase" -ForegroundColor White
    Write-Host "   2. Check if port 8090 is accessible" -ForegroundColor White
    Write-Host "   3. Open http://localhost:8090/_/ to view admin panel" -ForegroundColor White
    Write-Host "   4. Open http://localhost:5173/wallet-test to test wallet" -ForegroundColor White
}
