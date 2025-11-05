# Script để chạy cả Gateway và Blockchain Service (Windows PowerShell)
Write-Host "🚀 Starting All Eneegy Services..." -ForegroundColor Green
Write-Host "Architecture: Microservices - Gateway + Blockchain Service" -ForegroundColor Cyan
Write-Host ""

# Kiểm tra Rust đã cài đặt
if (!(Get-Command cargo -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Rust chưa được cài đặt. Vui lòng cài đặt Rust từ https://rustup.rs/" -ForegroundColor Red
    exit 1
}

# Build cả hai services
Write-Host "🔨 Building all services..." -ForegroundColor Yellow

# Build Blockchain Service
Write-Host "Building Blockchain Service..." -ForegroundColor Gray
Set-Location eneegy-blockchain-service
cargo build --release
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Blockchain Service build failed!" -ForegroundColor Red
    exit 1
}
Set-Location ..

# Build Gateway Service
Write-Host "Building Gateway Service..." -ForegroundColor Gray
cargo build --release
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Gateway Service build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ All builds successful!" -ForegroundColor Green
Write-Host ""

# Khởi động services
Write-Host "🎯 Starting Services..." -ForegroundColor Cyan
Write-Host "1. Blockchain Service (gRPC) - Port 50051" -ForegroundColor White
Write-Host "2. Gateway Service (HTTP) - Port 8080" -ForegroundColor White
Write-Host ""

# Mở terminal mới cho Blockchain Service
Write-Host "🔄 Starting Blockchain Service in new terminal..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; .\run-blockchain-service.ps1"

# Đợi 3 giây để Blockchain Service khởi động
Start-Sleep -Seconds 3

# Chạy Gateway Service trong terminal hiện tại
Write-Host "🔄 Starting Gateway Service..." -ForegroundColor Yellow
Write-Host "⚠️  Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host ""

# Chạy Gateway Service
& ".\target\release\gateway.exe"



