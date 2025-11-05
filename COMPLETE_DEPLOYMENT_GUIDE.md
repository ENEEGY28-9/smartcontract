# 🚀 COMPLETE GAME TOKEN DEPLOYMENT GUIDE

## 📋 CURRENT STATUS
- ✅ Smart contract built successfully
- ✅ Anchor installed (v0.32.1)
- 🔄 Need Solana CLI installation

## Step 1: Install Solana CLI (MANUAL)

**File đã được download:** `solana-release.tar.bz2`

### Instructions:
1. **Extract the file:**
   - Right-click `solana-release.tar.bz2`
   - Extract using 7zip/WinRAR to folder `solana-cli`
   - Should create: `solana-cli\bin\solana.exe`

2. **Add to PATH:**
   - Copy folder path: `C:\Users\Fit\Downloads\eneegy-main\solana-cli\bin`
   - Add to Windows PATH environment variable
   - Or run: `setup_solana_after_extract.bat`

3. **Verify installation:**
   ```bash
   solana --version
   # Should show: solana-cli 1.18.4
   ```

## Step 2: Configure Solana

After Solana CLI is installed, run these commands:

```bash
# Set devnet RPC
solana config set --url https://api.devnet.solana.com

# Generate keypair
solana-keygen new --no-bip39-passphrase --silent

# Check address
solana address

# Get devnet SOL
solana airdrop 2

# Check balance
solana balance
```

## Step 3: Deploy Smart Contract

```bash
# Navigate to smart contract (already done)
cd blockchain-service/programs/game-token

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Note the Program ID shown (example: AbCdEfGhIjKlMnOpQrStUvWxYz...)
```

## Step 4: Update Program ID

Run the update script:
```bash
update_program_id.bat
# Enter the Program ID from Step 3
```

## Step 5: Test Real Minting

```bash
# Test real blockchain minting
test_real_minting.bat
```

---

## 🔧 AUTOMATION SCRIPTS CREATED

### Files ready to use:
- `setup_solana_after_extract.bat` - Setup after manual extraction
- `update_program_id.bat` - Update program ID after deployment
- `test_real_minting.bat` - Test real blockchain transactions

### Deployment checklist:
- `DEPLOYMENT_READY_CHECKLIST.md` - Complete deployment guide

---

## 🎯 EXPECTED RESULTS

After successful deployment:
- ✅ **Real Solana transactions** visible on explorer
- ✅ **Live token minting** from game actions
- ✅ **Real balance updates** from blockchain
- ✅ **Production ready** for mainnet

---

## 📞 MANUAL EXTRACTION STEPS

If you need help extracting:

1. **Download 7zip** (if not installed): https://www.7-zip.org/
2. **Extract `solana-release.tar.bz2`:**
   - Right-click → 7-Zip → Extract here
   - Should create `solana-release.tar`
3. **Extract `solana-release.tar`:**
   - Right-click → 7-Zip → Extract here
   - Should create `solana-release` folder
4. **Rename to `solana-cli`:**
   - Rename `solana-release` → `solana-cli`
5. **Add to PATH:**
   - Run `setup_solana_after_extract.bat`

---

## 🚨 IF ISSUES OCCUR

### Build Issues:
```bash
cd blockchain-service/programs/game-token
anchor clean
anchor build
```

### Deployment Issues:
```bash
# Check balance
solana balance

# Get more SOL
solana airdrop 1

# Try different RPC
solana config set --url https://devnet.genesysgo.net/
```

---

## 🎉 FINAL SUCCESS

After completion:
- **REAL BLOCKCHAIN**: All token operations on Solana
- **VIEWABLE TRANSACTIONS**: Check on https://explorer.solana.com
- **PRODUCTION READY**: Ready for mainnet deployment
- **COMPLETE INTEGRATION**: Game → Blockchain → UI

---

**📞 READY FOR DEPLOYMENT! Follow the steps above.**

