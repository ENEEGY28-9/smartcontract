# Test script cho ví Solana thực (Simple version)
$WALLET_ADDRESS = "57arM3rLe8LHfzn7coyUu6KGhxLQ6nfP87mHTHpM2SGB"
$SOLANA_RPC = "https://api.mainnet-beta.solana.com"

Write-Host "=== KIEM TRA KET NOI VI SOLANA ===" -ForegroundColor Cyan
Write-Host "Dia chi vi: $WALLET_ADDRESS" -ForegroundColor Yellow
Write-Host ""

try {
    Write-Host "Ket noi den Solana network..." -ForegroundColor Green

    # Test basic connectivity
    $response = Invoke-WebRequest -Uri "$SOLANA_RPC" -Method POST -Body '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' -ContentType "application/json"

    if ($response.StatusCode -eq 200) {
        Write-Host "Solana network accessible" -ForegroundColor Green
    } else {
        Write-Host "Cannot reach Solana network" -ForegroundColor Red
        exit 1
    }

    Write-Host "Kiem tra thong tin vi..." -ForegroundColor Cyan

    # Get balance
    $balanceBody = '{"jsonrpc":"2.0","id":1,"method":"getBalance","params":["' + $WALLET_ADDRESS + '"]}'
    $balanceResponse = Invoke-WebRequest -Uri "$SOLANA_RPC" -Method POST -Body $balanceBody -ContentType "application/json"
    $balanceData = $balanceResponse.Content | ConvertFrom-Json

    $balanceLamports = $balanceData.result.value
    $balanceSOL = $balanceLamports / 1000000000

    Write-Host "So du: $($balanceSOL.ToString("F4")) SOL" -ForegroundColor Green
    Write-Host "So du raw: $balanceLamports lamports" -ForegroundColor Gray

    # Check account info
    $accountBody = '{"jsonrpc":"2.0","id":1,"method":"getAccountInfo","params":["' + $WALLET_ADDRESS + '"]}'
    $accountResponse = Invoke-WebRequest -Uri "$SOLANA_RPC" -Method POST -Body $accountBody -ContentType "application/json"
    $accountData = $accountResponse.Content | ConvertFrom-Json

    if ($accountData.result.value) {
        Write-Host "Vi ton tai tren Solana network" -ForegroundColor Green
        Write-Host "Account Owner: $($accountData.result.value.owner)" -ForegroundColor Gray
        Write-Host "Data Length: $($accountData.result.value.data.length) bytes" -ForegroundColor Gray
    } else {
        Write-Host "Vi chua duoc kich hoat (co the can airdrop)" -ForegroundColor Yellow
    }

    # Check recent transactions
    $txBody = '{"jsonrpc":"2.0","id":1,"method":"getSignaturesForAddress","params":["' + $WALLET_ADDRESS + '", {"limit": 3}]}'
    $txResponse = Invoke-WebRequest -Uri "$SOLANA_RPC" -Method POST -Body $txBody -ContentType "application/json"
    $txData = $txResponse.Content | ConvertFrom-Json

    if ($txData.result -and $txData.result.Length -gt 0) {
        Write-Host "Giao dich gan day: $($txData.result.Length) tx" -ForegroundColor Green
        for ($i = 0; $i -lt [Math]::Min(3, $txData.result.Length); $i++) {
            $tx = $txData.result[$i]
            Write-Host "   $($i + 1). $($tx.signature.Substring(0, 8))... ($($tx.confirmationStatus))" -ForegroundColor Gray
        }
    } else {
        Write-Host "Chua co giao dich nao" -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "=== KET QUA ===" -ForegroundColor Cyan
    Write-Host "Dia chi: $WALLET_ADDRESS" -ForegroundColor White
    Write-Host "So du: $($balanceSOL.ToString("F4")) SOL" -ForegroundColor White
    Write-Host "Trang thai: $(if($accountData.result.value) {'Active'} else {'Inactive'})" -ForegroundColor White

    if ($balanceSOL -eq 0) {
        Write-Host ""
        Write-Host "Luu y: Vi chua co SOL. Ban co the:" -ForegroundColor Yellow
        Write-Host "   1. Nhan test SOL tu faucet: https://faucet.solana.com/" -ForegroundColor Gray
        Write-Host "   2. Hoac chuyen SOL tu vi khac" -ForegroundColor Gray
    }

} catch {
    Write-Host "Loi khi kiem tra vi: $($_.Exception.Message)" -ForegroundColor Red

    if ($_.Exception.Message.Contains("Invalid")) {
        Write-Host "Kiem tra: Dia chi vi co dung dinh dang khong?" -ForegroundColor Yellow
    } elseif ($_.Exception.Message.Contains("fetch")) {
        Write-Host "Kiem tra: Ket noi internet" -ForegroundColor Yellow
    }
}


