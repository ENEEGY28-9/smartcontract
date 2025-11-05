# Test script cho ví Solana thực
$WALLET_ADDRESS = "57arM3rLe8LHfzn7coyUu6KGhxLQ6nfP87mHTHpM2SGB"
$SOLANA_RPC = "https://api.mainnet-beta.solana.com"

Write-Host "🧪 Đang kiểm tra kết nối ví..." -ForegroundColor Cyan
Write-Host "📍 Địa chỉ ví: $WALLET_ADDRESS" -ForegroundColor Yellow

try {
    # Khởi tạo connection
    Write-Host "🔗 Kết nối đến Solana mainnet..." -ForegroundColor Green

    # Test basic connectivity
    $response = Invoke-WebRequest -Uri "$SOLANA_RPC" -Method POST -Body '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' -ContentType "application/json"

    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Solana network accessible" -ForegroundColor Green
    } else {
        Write-Host "❌ Cannot reach Solana network" -ForegroundColor Red
        exit 1
    }

    # Test wallet format
    if ($WALLET_ADDRESS.Length -eq 44 -and $WALLET_ADDRESS.StartsWith("1")) {
        Write-Host "✅ Định dạng địa chỉ hợp lệ" -ForegroundColor Green
    } else {
        Write-Host "❌ Định dạng địa chỉ không hợp lệ" -ForegroundColor Red
        exit 1
    }

    Write-Host "📋 Kiểm tra thông tin ví..." -ForegroundColor Cyan

    # Get balance (using simple curl for now)
    $balanceBody = @"
{"jsonrpc":"2.0","id":1,"method":"getBalance","params":["$WALLET_ADDRESS"]}
"@
    $balanceResponse = Invoke-WebRequest -Uri "$SOLANA_RPC" -Method POST -Body $balanceBody -ContentType "application/json"
    $balanceData = $balanceResponse.Content | ConvertFrom-Json

    $balanceLamports = $balanceData.result.value
    $balanceSOL = $balanceLamports / 1000000000

    Write-Host "💰 Số dư: $($balanceSOL.ToString("F4")) SOL" -ForegroundColor Green
    Write-Host "📊 Số dư raw: $balanceLamports lamports" -ForegroundColor Gray

    # Check account info
    $accountBody = @"
{"jsonrpc":"2.0","id":1,"method":"getAccountInfo","params":["$WALLET_ADDRESS"]}
"@
    $accountResponse = Invoke-WebRequest -Uri "$SOLANA_RPC" -Method POST -Body $accountBody -ContentType "application/json"
    $accountData = $accountResponse.Content | ConvertFrom-Json

    if ($accountData.result.value) {
        Write-Host "✅ Ví tồn tại trên Solana network" -ForegroundColor Green
        Write-Host "📋 Account Owner: $($accountData.result.value.owner)" -ForegroundColor Gray
        Write-Host "📊 Data Length: $($accountData.result.value.data.length) bytes" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  Ví chưa được kích hoạt (có thể cần airdrop)" -ForegroundColor Yellow
    }

    # Check recent transactions
    $txBody = @"
{"jsonrpc":"2.0","id":1,"method":"getSignaturesForAddress","params":["$WALLET_ADDRESS", {"limit": 3}]}
"@
    $txResponse = Invoke-WebRequest -Uri "$SOLANA_RPC" -Method POST -Body $txBody -ContentType "application/json"
    $txData = $txResponse.Content | ConvertFrom-Json

    if ($txData.result -and $txData.result.Length -gt 0) {
        Write-Host "📈 Giao dịch gần đây: $($txData.result.Length) tx" -ForegroundColor Green
        for ($i = 0; $i -lt [Math]::Min(3, $txData.result.Length); $i++) {
            $tx = $txData.result[$i]
            Write-Host "   $($i + 1). $($tx.signature.Substring(0, 8))... ($($tx.confirmationStatus))" -ForegroundColor Gray
        }
    } else {
        Write-Host "📭 Chưa có giao dịch nào" -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "🎉 Kiểm tra ví hoàn tất!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Kết quả:" -ForegroundColor Cyan
    Write-Host "   - Địa chỉ: $WALLET_ADDRESS" -ForegroundColor White
    Write-Host "   - Số dư: $($balanceSOL.ToString("F4")) SOL" -ForegroundColor White
    Write-Host "   - Trạng thái: $(if($accountData.result.value) {'Active'} else {'Inactive'})" -ForegroundColor White

    if ($balanceSOL -eq 0) {
        Write-Host ""
        Write-Host "💡 Lưu ý: Ví chưa có SOL. Bạn có thể:" -ForegroundColor Yellow
        Write-Host "   1. Nhận test SOL từ faucet: https://faucet.solana.com/" -ForegroundColor Gray
        Write-Host "   2. Hoặc chuyển SOL từ ví khác" -ForegroundColor Gray
    }

} catch {
    Write-Host "❌ Lỗi khi kiểm tra ví: $($_.Exception.Message)" -ForegroundColor Red

    if ($_.Exception.Message.Contains("Invalid")) {
        Write-Host "💡 Kiểm tra: Địa chỉ ví có đúng định dạng không?" -ForegroundColor Yellow
    } elseif ($_.Exception.Message.Contains("fetch")) {
        Write-Host "💡 Kiểm tra: Kết nối internet" -ForegroundColor Yellow
    }
}
