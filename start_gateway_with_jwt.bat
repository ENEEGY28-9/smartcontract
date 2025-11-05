@echo off
REM Start Gateway with JWT_SECRET set

echo 🚀 Starting Gateway with JWT_SECRET...
echo JWT_SECRET=your-secret-key-change-in-production

set JWT_SECRET=your-secret-key-change-in-production
cd C:\Users\Fit\Downloads\eneegy-main\gateway
cargo run

pause

