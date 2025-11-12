@echo off
echo 🚀 Running Build & Deploy in WSL
echo ===================================

echo 📋 Commands to run in WSL:
echo.

echo 1. Update system:
echo sudo apt update
echo.

echo 2. Install dependencies:
echo sudo apt install -y curl build-essential pkg-config libssl-dev
echo.

echo 3. Install Rust:
echo curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs ^| sh -s -- -y
echo source $HOME/.cargo/env
echo.

echo 4. Install Solana CLI:
echo sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"
echo export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
echo.

echo 5. Install Anchor:
echo cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
echo avm install latest
echo avm use latest
echo.

echo 6. Build and deploy:
echo cd /mnt/c/Users/Fit/Downloads/eneegy-main/game_token
echo anchor build
echo anchor deploy --provider.cluster devnet
echo.

echo 7. Test:
echo node player_claim_real.js qtfAibpP5SqJYLGTPedAJF8kTcnzZxeGXuxUDKw85ki 30
echo.

echo ===================================
echo 🖥️  OPEN WSL TERMINAL AND RUN ABOVE COMMANDS MANUALLY
echo ===================================

echo Alternatively, run WSL interactive:
wsl --distribution Ubuntu

echo Then navigate to project and run the commands above.

pause



