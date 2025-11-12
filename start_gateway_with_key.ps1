# Script để khởi động gateway với ENCRYPTION_KEY đúng
$env:ENCRYPTION_KEY = "KMbGqOScAkQTdsziLmHNDuCZPIWnpyoB"
Write-Host "ENCRYPTION_KEY set to: $env:ENCRYPTION_KEY"
Write-Host "Key length: $($env:ENCRYPTION_KEY.Length) characters"

cd "C:\Users\Fit\Downloads\eneegy-main\gateway"
cargo run --release










