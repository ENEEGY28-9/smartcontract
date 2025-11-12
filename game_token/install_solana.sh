#!/bin/bash

# Install Solana CLI in WSL

echo "Installing Solana CLI..."

# Download and install Solana
curl -sSfL https://release.solana.com/v1.18.4/install | sh

# Set PATH
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Wait for installation to complete
sleep 2

# Configure for devnet
solana config set --url https://api.devnet.solana.com

# Check installation
echo "Solana version: $(solana --version)"
echo "Current config: $(solana config get)"

echo "Solana CLI installation complete!"









