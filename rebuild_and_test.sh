#!/bin/bash
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
export PATH="$HOME/.avm/bin:$PATH"
source ~/.cargo/env

cd ~/game_token

echo "🧹 Cleaning old build..."
anchor clean

echo "🔨 Rebuilding with GCC 13..."
anchor build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"

    echo "🚀 Testing deployment..."
    solana program deploy target/deploy/game_token.so --program-id target/deploy/game_token-keypair.json --url devnet --skip-fee-check

    if [ $? -eq 0 ]; then
        echo "🎉 DEPLOYMENT SUCCESSFUL!"
        solana address -k target/deploy/game_token-keypair.json
    else
        echo "❌ Deployment failed with ELF error"
        echo "💡 SOLUTION: Use Solana Playground for deployment"
    fi
else
    echo "❌ Build failed"
fi


