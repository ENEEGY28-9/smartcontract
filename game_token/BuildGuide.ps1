Write-Host "==========================================="
Write-Host "🚀 BUILD & DEPLOY SMART CONTRACT"
Write-Host "==========================================="
Write-Host ""

Write-Host "📋 Huong dan build Smart Contract voi Player Claim:"
Write-Host ""

Write-Host "1. Su dung Docker (KHUYEN DUNG):"
Write-Host 'docker run --rm -v "$(pwd)":/workdir -w /workdir projectserum/build:latest anchor build'
Write-Host ""

Write-Host "2. Sau do deploy:"
Write-Host 'docker run --rm -v "$(pwd)":/workdir -w /workdir -v ~/.config/solana:/root/.config/solana projectserum/build:latest anchor deploy --provider.cluster devnet'
Write-Host ""

Write-Host "3. Test sau khi deploy:"
Write-Host "node player_claim_real.js qtfAibpP5SqJYLGTPedAJF8kTcnzZxeGXuxUDKw85ki 30"
Write-Host ""

Write-Host "==========================================="
Write-Host "🎯 KET QUA MONG DOI SAU KHI DEPLOY:"
Write-Host "==========================================="
Write-Host ""
Write-Host "🏦 Game Pool: 6519 → 6489 tokens (-30) ✅"
Write-Host "🎮 Player: 860 → 890 tokens (+30) ✅"
Write-Host "💸 Network Fee: ~0.000005 SOL (player tra) ✅"
Write-Host ""

Read-Host "Press Enter to continue"



