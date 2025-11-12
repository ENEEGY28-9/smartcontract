#!/bin/bash
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
export PATH="$HOME/.avm/bin:$PATH"
source ~/.cargo/env

# Setup Solana config
solana config set --url devnet

# Check balance
echo "Checking Solana balance..."
solana balance

# Go to project directory
cd ~/game_token

# Build smart contract
echo "Building smart contract..."
anchor build

# Deploy to devnet
echo "Deploying to devnet..."
anchor deploy --provider.cluster devnet

# Check deployment
echo "Verifying deployment..."
node check_program_deployment.js

echo "Setup completed!"


