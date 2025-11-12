#!/bin/bash

echo "🚀 FINAL DEPLOYMENT - STEP BY STEP VERIFICATION"
echo "=============================================="

cd /mnt/c/Users/Fit/Downloads/eneegy-main/game_token

# Step 1: Check if .so file exists
echo "📁 Step 1: Checking deployment files..."
if [ -f "target/deploy/game_token.so" ]; then
    echo "✅ game_token.so exists"
else
    echo "❌ game_token.so not found!"
    exit 1
fi

if [ -f "target/deploy/game_token-keypair.json" ]; then
    echo "✅ game_token-keypair.json exists"
else
    echo "❌ game_token-keypair.json not found!"
    exit 1
fi

# Step 2: Set up Solana CLI in WSL
echo "🔧 Step 2: Setting up Solana CLI..."
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Check if solana is available
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found in WSL!"
    echo "Installing Solana CLI..."
    sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"
    export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
fi

echo "✅ Solana CLI version: $(solana --version)"

# Step 3: Configure for devnet
echo "🌐 Step 3: Configuring for devnet..."
solana config set --url devnet
solana config get

# Step 4: Get program ID
echo "🔑 Step 4: Getting program ID..."
PROGRAM_ID=$(solana-keygen pubkey target/deploy/game_token-keypair.json)
echo "Program ID: $PROGRAM_ID"

# Step 5: Check balance
echo "💰 Step 5: Checking balance..."
BALANCE=$(solana balance --url devnet)
echo "Balance: $BALANCE"

# Check if balance is sufficient (need at least 1 SOL for deployment)
if (( $(echo "$BALANCE < 1.0" | bc -l 2>/dev/null || echo "1") )); then
    echo "❌ Insufficient balance! Need at least 1 SOL for deployment."
    exit 1
fi

# Step 6: Deploy with verbose output
echo "🚀 Step 6: DEPLOYING SMART CONTRACT..."
echo "Command: solana program deploy target/deploy/game_token.so --program-id $PROGRAM_ID --url devnet"

solana program deploy target/deploy/game_token.so --program-id "$PROGRAM_ID" --url devnet

# Check deployment result
if [ $? -eq 0 ]; then
    echo "✅ DEPLOYMENT COMPLETED!"

    # Step 7: Verify deployment
    echo "🔍 Step 7: VERIFYING DEPLOYMENT..."
    echo "Checking if program exists on devnet..."

    # Wait a bit for confirmation
    sleep 5

    # Check program account
    PROGRAM_INFO=$(solana program show "$PROGRAM_ID" --url devnet 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "✅ PROGRAM SUCCESSFULLY DEPLOYED!"
        echo "📄 Program ID: $PROGRAM_ID"
        echo "📊 Program Info:"
        echo "$PROGRAM_INFO"

        echo ""
        echo "🎉 BLOCKCHAIN INTEGRATION COMPLETE!"
        echo "🌐 Smart contract live on Solana devnet"
        echo ""
        echo "🧪 Ready for testing:"
        echo "   node player_claim_real.js AfQLRj5iiY3NkTEKZg61RpEv6p9y9yjYzxhLR9fuiLoD 30"
    else
        echo "❌ DEPLOYMENT VERIFICATION FAILED!"
        echo "Program may not be deployed correctly."
        exit 1
    fi
else
    echo "❌ DEPLOYMENT FAILED!"
    exit 1
fi


