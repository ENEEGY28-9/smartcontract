# 📦 EXTRACT SOLANA CLI GUIDE

## Step 1: Install 7-Zip (if not installed)

Download from: https://www.7-zip.org/
- Download "7-Zip for 64-bit Windows"
- Install with default settings

## Step 2: Extract Solana CLI

### Method A: Using 7-Zip GUI
1. **Find file**: `solana-release.tar.bz2` in project root
2. **Right-click** → **7-Zip** → **Extract here**
   - Creates: `solana-release.tar`
3. **Right-click** `solana-release.tar` → **7-Zip** → **Extract to "solana-cli\"**
   - Creates folder: `solana-cli\`
4. **Verify**: Check `solana-cli\bin\solana.exe` exists

### Method B: Using 7-Zip Command Line
```bash
# Extract .tar.bz2 to .tar
7z x solana-release.tar.bz2

# Extract .tar to folder
7z x solana-release.tar -osolana-cli
```

## Step 3: Verify Extraction
```bash
# Check if extraction successful
dir solana-cli\bin\solana.exe

# Should show: solana.exe file
```

## Step 4: Run Setup Script
```bash
# Run the setup script
setup_solana_after_extract.bat
```

## ✅ SUCCESS INDICATORS
- `solana --version` shows: `solana-cli 1.18.4`
- `solana config get` shows devnet URL
- `solana balance` shows SOL amount

---

## 🚨 IF ISSUES OCCUR

### File Not Found
```bash
# Redownload if needed
powershell -Command "Invoke-WebRequest -Uri 'https://github.com/solana-labs/solana/releases/download/v1.18.4/solana-release-x86_64-pc-windows-msvc.tar.bz2' -OutFile 'solana-release.tar.bz2'"
```

### 7-Zip Not Working
- Use WinRAR or other archive tool
- Or download installer from Solana website

---

## 🎯 NEXT STEPS AFTER EXTRACTION
1. ✅ Extract completed
2. 🔄 Run `setup_solana_after_extract.bat`
3. 🔄 Deploy smart contract
4. 🔄 Update program ID
5. 🔄 Test real minting

---

**📦 READY FOR EXTRACTION!**

