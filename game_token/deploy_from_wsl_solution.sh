#!/bin/bash

echo "SOLUTION 2: Deploy from WSL Environment"
echo "======================================="

cd /mnt/c/Users/Fit/Downloads/eneegy-main/game_token

# Method 1: Use pre-installed Solana CLI in WSL
if command -v solana &> /dev/null; then
    echo "Using existing Solana CLI in WSL..."
    export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
else
    echo "Installing Solana CLI in WSL..."
    # Try alternative installation method
    wget -O solana-cli.tar.bz2 https://release.solana.com/v1.18.4/solana-release-x86_64-unknown-linux-gnu.tar.bz2
    tar -xjf solana-cli.tar.bz2
    export PATH="$(pwd)/solana-release/bin:$PATH"
fi

# Configure for devnet
solana config set --url devnet
echo "Balance: $(solana balance)"

# Deploy using Linux-compatible .so file
echo "Deploying from WSL..."
solana program deploy target/deploy/game_token.so --program-id DdhUfxGFwmaHrz5WsJ2jXM5Xts14ctytBvaQ8QoyqgGq --url devnet

if [ $? -eq 0 ]; then
    echo "DEPLOYMENT SUCCESSFUL!"
    echo "Program ID: DdhUfxGFwmaHrz5WsJ2jXM5Xts14ctytBvaQ8QoyqgGq"

    # Test from WSL
    echo "Testing player claim..."
    node player_claim_real.js AfQLRj5iiY3NkTEKZg61RpEv6p9y9yjYzxhLR9fuiLoD 30
else
    echo "Deployment failed"
fi


