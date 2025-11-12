#!/bin/bash
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
source ~/.cargo/env
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
echo 'export PATH="$HOME/.avm/bin:$PATH"' >> ~/.bashrc
echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc


