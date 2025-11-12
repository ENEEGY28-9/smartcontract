#!/bin/bash
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
source ~/.cargo/env

# Remove current anchor
cargo uninstall anchor-cli 2>/dev/null || true

# Install Anchor 0.29.0
cargo install --git https://github.com/coral-xyz/anchor --tag v0.29.0 anchor-cli --locked --force

# Add to PATH
echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.bashrc
echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc


