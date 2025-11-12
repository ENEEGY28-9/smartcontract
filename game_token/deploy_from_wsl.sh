#!/bin/bash

echo "🚀 DEPLOYING FROM WSL"
echo "===================="

cd /mnt/c/Users/Fit/Downloads/eneegy-main/game_token

# Copy the .so file from WSL build
cp programs/game_token_v2/target/release/libgame_token_v2.so target/deploy/game_token.so

# Set PATH
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Get program ID from keypair
PROGRAM_ID=$(solana-keygen pubkey target/deploy/game_token-keypair.json)

echo "Program ID: $PROGRAM_ID"

# Deploy
echo "Deploying to devnet..."
solana program deploy target/deploy/game_token.so --program-id "$PROGRAM_ID" --url devnet

if [ $? -eq 0 ]; then
    echo "✅ DEPLOYMENT SUCCESSFUL!"
    echo "Program ID: $PROGRAM_ID"
else
    echo "❌ DEPLOYMENT FAILED!"
fi