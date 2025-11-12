@echo off
echo ===========================================
echo 🚀 BUILD & DEPLOY SMART CONTRACT
echo ===========================================
echo.

echo 📋 Huong dan build Smart Contract voi Player Claim:
echo.

echo 1. Su dung Docker (KHUYEN DUNG):
echo docker run --rm -v "%cd%":/workdir -w /workdir projectserum/build:latest anchor build
echo.

echo 2. Sau do deploy:
echo docker run --rm -v "%cd%":/workdir -w /workdir -v ~/.config/solana:/root/.config/solana projectserum/build:latest anchor deploy --provider.cluster devnet
echo.

echo 3. Test sau khi deploy:
echo node player_claim_real.js qtfAibpP5SqJYLGTPedAJF8kTcnzZxeGXuxUDKw85ki 30
echo.

echo ===========================================
echo 🎯 KET QUA MONG DOI SAU KHI DEPLOY:
echo ===========================================
echo.
echo 🏦 Game Pool: 6519 → 6489 tokens (-30) ✅
echo 🎮 Player: 860 → 890 tokens (+30) ✅
echo 💸 Network Fee: ~0.000005 SOL (player tra) ✅
echo.

pause



