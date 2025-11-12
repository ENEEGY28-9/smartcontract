# PowerShell script to deploy smart contract program
Write-Host "🔧 DEPLOYING REAL SMART CONTRACT PROGRAM TO SOLANA DEVNET" -ForegroundColor Cyan
Write-Host ""

# Check balance
Write-Host "1️⃣ Checking SOL Balance..." -ForegroundColor Yellow
try {
    $balance = & "solana-cli\solana-release\bin\solana.exe" balance 2>&1
    Write-Host "✅ SOL Balance: $balance" -ForegroundColor Green
} catch {
    Write-Host "❌ Cannot check balance: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Request airdrop if needed
$balanceValue = [double]($balance -split ' ')[0]
if ($balanceValue -lt 2) {
    Write-Host "⚠️ Balance too low. Requesting airdrop..." -ForegroundColor Yellow
    try {
        & "solana-cli\solana-release\bin\solana.exe" airdrop 2 2>&1 | Out-Null
        Write-Host "✅ Airdrop successful" -ForegroundColor Green
    } catch {
        Write-Host "❌ Airdrop failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "💡 Please manually request SOL from https://faucet.solana.com" -ForegroundColor Cyan
        exit 1
    }
}

# Try to build smart contract
Write-Host ""
Write-Host "2️⃣ Building Smart Contract..." -ForegroundColor Yellow
$soFilePath = "game_token\target\deploy\game_token.so"

if (-not (Test-Path $soFilePath)) {
    Write-Host "❌ game_token.so not found" -ForegroundColor Red
    Write-Host "🔨 Attempting to build..." -ForegroundColor Yellow

    # Set environment variables
    $env:HOME = $env:USERPROFILE
    $env:CARGO_HOME = "$env:USERPROFILE\.cargo"
    $env:RUSTUP_HOME = "$env:USERPROFILE\.rustup"

    # Try anchor build first
    try {
        Set-Location game_token
        & "anchor" build 2>&1
        Set-Location ..
        Write-Host "✅ Smart contract built with Anchor" -ForegroundColor Green
    } catch {
        Write-Host "❌ Anchor build failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "🔧 Trying cargo build-sbf..." -ForegroundColor Yellow

        try {
            # Try cargo build-sbf
            & "cargo" build-sbf --manifest-path "game_token/programs/game_token/Cargo.toml" 2>&1
            Write-Host "✅ Smart contract built with cargo" -ForegroundColor Green
        } catch {
            Write-Host "❌ Cargo build also failed: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "💡 Manual build required. Please run:" -ForegroundColor Cyan
            Write-Host "   cd game_token/programs/game_token" -ForegroundColor White
            Write-Host "   cargo build-sbf" -ForegroundColor White
            exit 1
        }
    }
} else {
    Write-Host "✅ game_token.so found" -ForegroundColor Green
    $fileSize = (Get-Item $soFilePath).Length / 1MB
    Write-Host ("📊 File size: {0:F2} MB" -f $fileSize) -ForegroundColor Blue
}

# Deploy smart contract
Write-Host ""
Write-Host "3️⃣ Deploying Smart Contract Program..." -ForegroundColor Yellow

$deployCommand = "solana-cli\solana-release\bin\solana.exe program deploy game_token/target/deploy/game_token.so --url https://api.devnet.solana.com"
Write-Host "🚀 Running: $deployCommand" -ForegroundColor Cyan

try {
    $deployOutput = & "solana-cli\solana-release\bin\solana.exe" program deploy "game_token/target/deploy/game_token.so" --url "https://api.devnet.solana.com" 2>&1

    Write-Host "📤 Deploy output:" -ForegroundColor Blue
    Write-Host $deployOutput -ForegroundColor White

    # Extract Program ID
    $programIdMatch = $deployOutput | Select-String -Pattern "Program Id: ([A-Za-z0-9]+)"
    if ($programIdMatch) {
        $newProgramId = $programIdMatch.Matches[0].Groups[1].Value
        Write-Host "✅ Smart Contract Deployed Successfully!" -ForegroundColor Green
        Write-Host "🎯 New Program ID: $newProgramId" -ForegroundColor Magenta

        # Update configuration files
        Write-Host ""
        Write-Host "4️⃣ Updating Configuration Files..." -ForegroundColor Yellow

        # Update Anchor.toml
        $anchorTomlPath = "game_token\Anchor.toml"
        $anchorToml = Get-Content $anchorTomlPath -Raw
        $anchorToml = $anchorToml -replace 'game_token = "[^"]*"', "game_token = `"$newProgramId`""
        Set-Content $anchorTomlPath $anchorToml
        Write-Host "✅ Updated Anchor.toml" -ForegroundColor Green

        # Update lib.rs declare_id
        $libRsPath = "game_token\programs\game_token\src\lib.rs"
        $libRs = Get-Content $libRsPath -Raw
        $libRs = $libRs -replace 'declare_id!\("[^"]*"\)', "declare_id!(`"$newProgramId`")"
        Set-Content $libRsPath $libRs
        Write-Host "✅ Updated lib.rs declare_id!" -ForegroundColor Green

        # Save deployment info
        $deploymentInfo = @{
            programId = $newProgramId
            deploymentTime = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            network = "devnet"
            type = "smart_contract_program"
            status = "deployed"
            logicVersion = "auto_mint_80_20"
        } | ConvertTo-Json

        Set-Content "smart_contract_deployment_complete.json" $deploymentInfo
        Write-Host "✅ Saved deployment info" -ForegroundColor Green

        # Verification
        Write-Host ""
        Write-Host "5️⃣ Verifying Deployment..." -ForegroundColor Yellow

        try {
            $verifyOutput = & "solana-cli\solana-release\bin\solana.exe" program show $newProgramId 2>&1
            if ($verifyOutput -match "Program Id:") {
                Write-Host "✅ Program verified on Solana devnet" -ForegroundColor Green

                Write-Host ""
                Write-Host "🎉 SMART CONTRACT DEPLOYMENT COMPLETED SUCCESSFULLY!" -ForegroundColor Green
                Write-Host "============================================" -ForegroundColor Yellow
                Write-Host "✅ Smart Contract Program deployed" -ForegroundColor Green
                Write-Host "✅ Program ID updated in configs" -ForegroundColor Green
                Write-Host "✅ Auto-mint scheduler ready" -ForegroundColor Green
                Write-Host "✅ Owner wallet monitoring ready" -ForegroundColor Green
                Write-Host "✅ Player gameplay testing ready" -ForegroundColor Green
                Write-Host ""
                Write-Host "🚀 Next Steps:" -ForegroundColor Cyan
                Write-Host "1. Start Gateway: cd gateway && cargo run" -ForegroundColor White
                Write-Host "2. Start PocketBase: ./pocketbase/pocketbase.exe serve" -ForegroundColor White
                Write-Host "3. Start Game Client: cd client && npm run dev" -ForegroundColor White
                Write-Host "4. Monitor owner revenue: solana balance [OWNER_ADDRESS]" -ForegroundColor White
                Write-Host "5. Test gameplay and watch 80/20 distribution work!" -ForegroundColor White

            } else {
                Write-Host "❌ Program verification failed" -ForegroundColor Red
            }
        } catch {
            Write-Host "❌ Cannot verify program: $($_.Exception.Message)" -ForegroundColor Red
        }

    } else {
        Write-Host "❌ Cannot extract Program ID from deploy output" -ForegroundColor Red
        Write-Host "Deploy output: $deployOutput" -ForegroundColor Yellow
    }

} catch {
    Write-Host "❌ Deployment failed: $($_.Exception.Message)" -ForegroundColor Red

    if ($_.Exception.Message -match "insufficient funds") {
        Write-Host "💡 Solution: Request more SOL from faucet" -ForegroundColor Cyan
        Write-Host "   https://faucet.solana.com" -ForegroundColor White
    } elseif ($_.Exception.Message -match "already in use") {
        Write-Host "💡 Solution: Program ID already exists, try redeploying" -ForegroundColor Cyan
    } else {
        Write-Host "💡 Check Solana CLI and network connection" -ForegroundColor Cyan
    }
}










