# Deploy from Docker container to avoid ELF compatibility issues
Write-Host "DEPLOY FROM DOCKER CONTAINER" -ForegroundColor Green
Write-Host "============================" -ForegroundColor Green

# Check Docker
Write-Host "Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>&1
    if ($dockerVersion -like "*Docker version*") {
        Write-Host "SUCCESS: Docker is ready" -ForegroundColor Green
    } else {
        throw "Docker not found"
    }
} catch {
    Write-Host "ERROR: Docker not available" -ForegroundColor Red
    exit 1
}

Write-Host "Deploying smart contract from Docker container..." -ForegroundColor Yellow
Write-Host "This will deploy directly to devnet from Linux environment" -ForegroundColor Cyan

$deployCommand = @"
docker run --rm -v ${pwd}:/workdir -v ${env:USERPROFILE}/.config/solana:/root/.config/solana -w /workdir ubuntu:24.04 /bin/bash -c "
apt-get update > /dev/null 2>&1 &&
apt-get install -y curl build-essential pkg-config libudev-dev > /dev/null 2>&1 &&
chmod +x /workdir/docker_build.sh &&
/workdir/docker_build.sh > /dev/null 2>&1 &&
echo 'Smart contract built successfully!' &&
echo 'Setting up Solana environment...' &&
export PATH=/root/.local/share/solana/install/active_release/bin:\$PATH &&
solana config set --url devnet --keypair /root/.config/solana/id.json &&
echo 'Checking wallet balance...' &&
solana balance &&
echo 'Deploying smart contract...' &&
solana program deploy target/deploy/game_token.so --program-id target/deploy/game_token-keypair.json --url devnet &&
echo 'DEPLOYMENT SUCCESSFUL!' &&
echo 'Program ID:' &&
solana address -k target/deploy/game_token-keypair.json
"
"@

Write-Host "Running deployment command..." -ForegroundColor Gray
try {
    Invoke-Expression $deployCommand

    if ($LASTEXITCODE -eq 0) {
        Write-Host "DEPLOYMENT COMPLETED SUCCESSFULLY!" -ForegroundColor Green
        Write-Host "Smart contract is now live on Solana devnet!" -ForegroundColor Green
    } else {
        Write-Host "Deployment failed!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error during deployment: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "NEXT STEP: Test the deployed smart contract" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Run this command to test player claims:" -ForegroundColor Cyan
Write-Host "node player_claim_real.js AfQLRj5iiY3NkTEKZg61RpEv6p9y9yjYzxhLR9fuiLoD 30" -ForegroundColor White
