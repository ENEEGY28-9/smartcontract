#!/bin/bash

echo "🚀 DEPLOYING WITH ANCHOR FRAMEWORK"
echo "==================================="

PROJECT_DIR="/mnt/c/Users/Fit/Downloads/eneegy-main/game_token"
cd "$PROJECT_DIR"

# Set PATH for tools
export PATH="$PROJECT_DIR/solana-release/bin:$PATH"
export PATH="$PROJECT_DIR/node_modules/.bin:$PATH"

echo "📂 Project directory: $(pwd)"

# Configure Solana
echo "⚙️ Configuring Solana..."
solana config set --url https://api.devnet.solana.com

# Check wallet
echo "🔑 Wallet address: $(solana address)"

# Check balance
echo "💰 Balance: $(solana balance)"

# Try Anchor build and deploy
echo ""
echo "🔨 BUILDING WITH ANCHOR..."
echo "=========================="

if anchor build 2>/dev/null; then
    echo "✅ Anchor build successful!"

    echo ""
    echo "🚀 DEPLOYING TO DEVNET..."
    echo "========================="

    if anchor deploy --provider.cluster devnet 2>/dev/null; then
        echo "🎉 DEPLOYMENT SUCCESSFUL!"

        # Get program ID
        PROGRAM_ID=$(solana program show --programs | grep game_token | awk '{print $1}' 2>/dev/null)
        if [ ! -z "$PROGRAM_ID" ]; then
            echo "📄 Program ID: $PROGRAM_ID"
            echo "{\"programId\": \"$PROGRAM_ID\"}" > deployment_result.json
        fi

        echo ""
        echo "🏆 DEPLOYMENT COMPLETE!"
        echo "💎 Smart contract deployed to Solana devnet"

    else
        echo "❌ Anchor deploy failed"
        echo "💡 Checking IDL file..."
        if [ -f "target/idl/game_token.json" ]; then
            echo "✅ IDL file exists"
            echo "💡 Trying manual deploy..."
            # Get program ID from IDL
            IDL_PROGRAM_ID=$(cat target/idl/game_token.json | grep '"address"' | head -1 | cut -d'"' -f4)
            echo "📄 Program ID from IDL: $IDL_PROGRAM_ID"

            # Deploy manually
            if solana program deploy target/deploy/game_token.so --program-id target/deploy/game_token-keypair.json 2>/dev/null; then
                echo "✅ Manual deployment successful!"
                echo "{\"programId\": \"$IDL_PROGRAM_ID\"}" > deployment_result.json
            else
                echo "❌ Manual deployment also failed"
            fi
        else
            echo "❌ IDL file missing - build failed"
        fi
    fi

else
    echo "❌ Anchor build failed"
    echo "💡 Checking available tools..."
    echo "Rust: $(rustc --version 2>/dev/null || echo 'Not found')"
    echo "Anchor: $(anchor --version 2>/dev/null || echo 'Not found')"
    echo "Solana: $(solana --version 2>/dev/null || echo 'Not found')"
fi

echo ""
echo "📋 DEPLOYMENT STATUS SUMMARY"
echo "============================"
if [ -f "deployment_result.json" ]; then
    cat deployment_result.json
else
    echo "❌ No deployment result found"
fi



