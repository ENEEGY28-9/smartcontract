#!/bin/bash

echo "🚀 DEPLOYING SMART CONTRACT TO SOLANA DEVNET"
echo "============================================"

# Set paths
PROJECT_DIR="/mnt/c/Users/Fit/Downloads/eneegy-main/game_token"
SOLANA_BIN="$PROJECT_DIR/solana-release/bin/solana"
ANCHOR_BIN="$PROJECT_DIR/node_modules/.bin/anchor"

cd "$PROJECT_DIR"
echo "📂 Project directory: $(pwd)"

# Set PATH
export PATH="$PROJECT_DIR/solana-release/bin:$PATH"
export PATH="$PROJECT_DIR/node_modules/.bin:$PATH"

# Configure Solana
echo "⚙️ Configuring Solana..."
solana config set --url https://api.devnet.solana.com
echo "Network: $(solana config get | grep 'RPC URL')"

# Check wallet
echo "🔑 Checking wallet..."
if [ -f ~/.config/solana/id.json ]; then
    echo "✅ Wallet exists"
    echo "Address: $(solana address)"
else
    echo "❌ Wallet not found - copying from Windows..."
    mkdir -p ~/.config/solana
    cp /mnt/c/Users/Fit/.config/solana/id.json ~/.config/solana/id.json
    echo "✅ Wallet copied"
fi

# Check balance
echo "💰 Checking balance..."
BALANCE=$(solana balance 2>/dev/null || echo "0 SOL")
echo "Balance: $BALANCE"

# Airdrop if needed
SOL_AMOUNT=$(echo $BALANCE | grep -o '[0-9.]*' | head -1)
if (( $(echo "$SOL_AMOUNT < 1" | bc -l 2>/dev/null || echo "1") )); then
    echo "⚠️ Low balance - requesting airdrop..."
    solana airdrop 2
    sleep 5
    echo "New balance: $(solana balance)"
fi

echo ""
echo "🔨 BUILDING SMART CONTRACT..."
echo "============================"

# Build with cargo (not anchor, since we have the .so file already)
echo "Using pre-built smart contract..."
if [ -f "programs/game_token_v2/target/release/libgame_token_v2.so" ]; then
    echo "✅ Smart contract build found: libgame_token_v2.so"

    echo ""
    echo "🚀 DEPLOYING TO DEVNET..."
    echo "========================="

    # Deploy the .so file directly
    DEPLOY_RESULT=$(solana program deploy programs/game_token_v2/target/release/libgame_token_v2.so --program-id target/deploy/game_token-keypair.json 2>&1)

    if echo "$DEPLOY_RESULT" | grep -q "Program Id:"; then
        PROGRAM_ID=$(echo "$DEPLOY_RESULT" | grep "Program Id:" | awk '{print $3}')
        echo "🎉 DEPLOYMENT SUCCESSFUL!"
        echo "📄 Program ID: $PROGRAM_ID"

        echo ""
        echo "📋 DEPLOYMENT SUMMARY:"
        echo "✅ Smart contract deployed to devnet"
        echo "✅ Program ID: $PROGRAM_ID"
        echo "✅ Ready for PDA initialization"

        # Save program ID
        echo "{\"programId\": \"$PROGRAM_ID\"}" > deployment_result.json
        echo "💾 Program ID saved to: deployment_result.json"

    else
        echo "❌ Deployment failed:"
        echo "$DEPLOY_RESULT"
        exit 1
    fi

else
    echo "❌ Smart contract build not found!"
    echo "💡 Need to build first: ./docker_build_cargo.sh"
    exit 1
fi

echo ""
echo "🎯 NEXT STEPS:"
echo "1. Initialize PDAs using the program ID"
echo "2. Test auto-mint functionality"
echo "3. Verify token distribution logic"
echo ""
echo "🏆 DEPLOYMENT COMPLETE!"



