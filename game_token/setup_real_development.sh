#!/bin/bash

# ===============================================
# SOLANA DEVELOPMENT ENVIRONMENT SETUP
# For Real Smart Contract Deployment
# ===============================================

echo "🚀 SOLANA DEVELOPMENT ENVIRONMENT SETUP"
echo "========================================"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if installation was successful
check_installation() {
    if command_exists "$1"; then
        echo "✅ $2 installed successfully"
        return 0
    else
        echo "❌ $2 installation failed"
        return 1
    fi
}

# 1. INSTALL RUST TOOLCHAIN
echo ""
echo "1️⃣ INSTALLING RUST TOOLCHAIN..."
echo "--------------------------------"

if command_exists rustc; then
    echo "✅ Rust already installed"
    rustc --version
else
    echo "📥 Installing Rust toolchain..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

    # Source rust environment
    source $HOME/.cargo/env

    if check_installation rustc "Rust"; then
        rustc --version
        cargo --version
    fi
fi

# Add Rust to PATH for future sessions
echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.bashrc
echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.profile

# 2. INSTALL SOLANA CLI
echo ""
echo "2️⃣ INSTALLING SOLANA CLI..."
echo "---------------------------"

if command_exists solana; then
    echo "✅ Solana CLI already installed"
    solana --version
else
    echo "📥 Installing Solana CLI..."
    sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"

    # Add Solana to PATH
    export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

    if check_installation solana "Solana CLI"; then
        solana --version

        # Configure Solana
        echo "⚙️ Configuring Solana for devnet..."
        solana config set --url https://api.devnet.solana.com
        solana config get
    fi
fi

# Add Solana to PATH for future sessions
echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc
echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.profile

# 3. INSTALL ANCHOR FRAMEWORK
echo ""
echo "3️⃣ INSTALLING ANCHOR FRAMEWORK..."
echo "---------------------------------"

if command_exists anchor; then
    echo "✅ Anchor already installed"
    anchor --version
else
    echo "📥 Installing Anchor..."

    # Install avm (Anchor Version Manager)
    cargo install --git https://github.com/coral-xyz/anchor avm --locked --force

    if check_installation avm "AVM"; then
        # Install latest Anchor
        avm install latest
        avm use latest

        if check_installation anchor "Anchor"; then
            anchor --version
        fi
    fi
fi

# 4. SETUP NODE.JS DEPENDENCIES
echo ""
echo "4️⃣ SETTING UP NODE.JS DEPENDENCIES..."
echo "-------------------------------------"

if command_exists node; then
    echo "✅ Node.js found"
    node --version
    npm --version
else
    echo "⚠️ Node.js not found. Please install Node.js first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Install/update Anchor CLI via npm
echo "📦 Installing Anchor CLI via npm..."
npm install -g @coral-xyz/anchor-cli

# 5. VERIFY INSTALLATION
echo ""
echo "5️⃣ VERIFYING INSTALLATION..."
echo "----------------------------"

echo "🔍 Checking all tools:"
echo ""

# Rust
if command_exists rustc; then
    echo "✅ Rust: $(rustc --version | head -1)"
else
    echo "❌ Rust: Not found"
fi

# Cargo
if command_exists cargo; then
    echo "✅ Cargo: $(cargo --version | head -1)"
else
    echo "❌ Cargo: Not found"
fi

# Solana CLI
if command_exists solana; then
    echo "✅ Solana CLI: $(solana --version | head -1)"
    echo "   Config: $(solana config get | grep -E 'RPC URL|Keypair')"
else
    echo "❌ Solana CLI: Not found"
fi

# Anchor
if command_exists anchor; then
    echo "✅ Anchor: $(anchor --version | head -1)"
else
    echo "❌ Anchor: Not found"
fi

# AVM
if command_exists avm; then
    echo "✅ AVM: $(avm --version | head -1)"
else
    echo "❌ AVM: Not found"
fi

# Node.js
if command_exists node; then
    echo "✅ Node.js: $(node --version)"
    echo "✅ NPM: $(npm --version)"
else
    echo "❌ Node.js: Not found"
fi

# 6. WALLET SETUP
echo ""
echo "6️⃣ WALLET SETUP..."
echo "------------------"

# Check if wallet exists
WALLET_PATH="$HOME/.config/solana/id.json"
if [ -f "$WALLET_PATH" ]; then
    echo "✅ Wallet found at: $WALLET_PATH"
    echo "   Public key: $(solana-keygen pubkey $WALLET_PATH)"
    echo "   SOL Balance: $(solana balance)"
else
    echo "⚠️ Wallet not found. Creating new wallet..."
    solana-keygen new --no-bip39-passphrase
    echo "✅ New wallet created"
    echo "   Public key: $(solana address)"
fi

# Request airdrop for devnet
echo "💰 Requesting SOL airdrop for devnet testing..."
solana airdrop 2

# 7. FINAL SETUP
echo ""
echo "7️⃣ FINAL SETUP & VERIFICATION..."
echo "---------------------------------"

# Source all environment variables
source ~/.bashrc
source ~/.profile

# Go to project directory
cd /mnt/c/Users/Fit/Downloads/eneegy-main/game_token

echo "📂 Project directory: $(pwd)"
echo "📁 Project files:"
ls -la | head -10

# 8. READY FOR DEVELOPMENT
echo ""
echo "🎉 DEVELOPMENT ENVIRONMENT READY!"
echo "=================================="
echo ""
echo "🚀 NEXT STEPS:"
echo ""
echo "1. Build smart contract:"
echo "   anchor build"
echo ""
echo "2. Deploy to devnet:"
echo "   anchor deploy --provider.cluster devnet"
echo ""
echo "3. Test auto-mint:"
echo "   node test_auto_mint_v2.js"
echo ""
echo "4. Test player claim:"
echo "   node player_claim_real.js <player_wallet> <amount>"
echo ""
echo "5. Verify on explorer:"
echo "   https://explorer.solana.com/address/Do9Bq3c7rSSU4YW32F3mCZekQZo5jdyaBuayqmNGAeTf?cluster=devnet"
echo ""
echo "📚 DOCUMENTATION:"
echo "   - Solana: https://docs.solana.com/"
echo "   - Anchor: https://www.anchor-lang.com/"
echo "   - SPL Token: https://spl.solana.com/token"
echo ""
echo "🔧 TROUBLESHOOTING:"
echo "   - Check versions: solana --version, anchor --version"
echo "   - Wallet balance: solana balance"
echo "   - Config: solana config get"
echo ""
echo "✅ SETUP COMPLETE - READY FOR REAL SMART CONTRACT DEVELOPMENT!"


