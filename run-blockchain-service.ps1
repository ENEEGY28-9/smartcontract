# Script để chạy Blockchain Service standalone (Windows PowerShell)
Write-Host "🚀 Starting Blockchain Service..." -ForegroundColor Green

# Kiểm tra Rust đã cài đặt
if (!(Get-Command cargo -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Rust chưa được cài đặt. Vui lòng cài đặt Rust từ https://rustup.rs/" -ForegroundColor Red
    exit 1
}

# Di chuyển vào thư mục blockchain service
Set-Location eneegy-blockchain-service

# Build release version
Write-Host "🔨 Building Blockchain Service..." -ForegroundColor Yellow
cargo build --release

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build successful!" -ForegroundColor Green

# Chạy service
Write-Host "🎯 Starting Blockchain Service on port 50051..." -ForegroundColor Cyan
Write-Host "📡 gRPC server will be available at http://localhost:50051" -ForegroundColor Cyan
Write-Host "⚠️  Press Ctrl+C to stop the service" -ForegroundColor Yellow

# Chạy service
& ".\target\release\blockchain-service.exe"

Write-Host "🛑 Blockchain Service stopped" -ForegroundColor Yellow



