# Script để chạy Gateway Service (Windows PowerShell)
Write-Host "🚀 Starting Gateway Service..." -ForegroundColor Green

# Kiểm tra Rust đã cài đặt
if (!(Get-Command cargo -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Rust chưa được cài đặt. Vui lòng cài đặt Rust từ https://rustup.rs/" -ForegroundColor Red
    exit 1
}

# Build release version
Write-Host "🔨 Building Gateway Service..." -ForegroundColor Yellow
cargo build --release

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build successful!" -ForegroundColor Green

# Chạy service
Write-Host "🌐 Starting Gateway Service on port 8080..." -ForegroundColor Cyan
Write-Host "📡 API server will be available at http://localhost:8080" -ForegroundColor Cyan
Write-Host "🪙 Token APIs available at http://localhost:8080/api/token/*" -ForegroundColor Cyan
Write-Host "⚠️  Press Ctrl+C to stop the service" -ForegroundColor Yellow

# Chạy service
& ".\target\release\gateway.exe"

Write-Host "🛑 Gateway Service stopped" -ForegroundColor Yellow












