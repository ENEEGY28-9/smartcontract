#!/bin/bash

# Install Rust in WSL
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

# Source Rust environment
source ~/.cargo/env

# Verify installation
echo "Rust version: $(rustc --version)"
echo "Cargo version: $(cargo --version)"

echo "Rust installation complete!"









