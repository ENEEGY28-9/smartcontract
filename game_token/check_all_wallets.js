const {
  Connection,
  PublicKey,
  Keypair
} = require('@solana/web3.js');
const {
  TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddress
} = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');

async function checkAllWallets() {
  console.log('🔍 KIỂM TRA TẤT CẢ CÁC VÍ TRONG HỆ THỐNG');
  console.log('='.repeat(70));

  // Connect to devnet first (for comparison)
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Load production config
  let productionConfig;
  try {
    productionConfig = JSON.parse(fs.readFileSync('./production_config.json'));
    console.log('✅ Production config loaded');
  } catch (error) {
    console.log('⚠️ Production config not found, using manual addresses');
    productionConfig = {
      gameTokenMint: 'ANzKnYDd7BpiPEykuHxrfAsiox19aWzLbZrmQbL8J8Qk',
      gamePoolsTokenAccount: 'HHHaKDSbruknbEFqwB3tfMQ5dAyatyavi15JHvFATssq',
      wallet: '4RMvAaGuBUeRSEYBRhkmBQnxUFtJa9PxWyR5YEVEfeeY'
    };
  }

  // Define all wallets to check
  const wallets = [
    {
      name: 'Main Deployment Wallet',
      address: productionConfig.wallet,
      description: 'Ví chính được dùng để deploy smart contract'
    },
    {
      name: 'Game Pool Owner Wallet',
      address: 'A1Tk1KLSkH4dbeS1mKv9CrUKVRuErHGBg6oH9XUD2sLB',
      description: 'Ví owner của game pool từ game_pool_owner.json'
    },
    {
      name: 'Devnet Wallet',
      address: '4UkWvx2Y59XSuhaCfeYDS56RM1WcsSdgjJ7yzLEbMyNf',
      description: 'Ví devnet từ devnet_wallet.json'
    },
    {
      name: 'New Owner Wallet',
      address: '5BzeVCppuFzyLs5aM1f3n8BatqoUCx9hg5N7288zRSCN',
      description: 'Ví owner mới từ new_owner_wallet.json'
    }
  ];

  // Define token accounts to check
  const tokenAccounts = [
    {
      name: 'Game Pools Token Account',
      address: productionConfig.gamePoolsTokenAccount,
      description: 'Token account chứa tokens cho game pool distribution'
    },
    {
      name: 'Owner Token Account',
      address: '4K9tg8tAFMGYCZkSJA3UhC5hizFfkAceoMn6L6gfNiW9',
      description: 'Token account của owner wallet'
    }
  ];

  const gameTokenMint = new PublicKey(productionConfig.gameTokenMint);

  console.log(`\n🪙 Game Token Mint: ${gameTokenMint.toString()}`);
  console.log(`📋 Network: Solana Devnet (Test Network)\n`);

  // Check SOL balances
  console.log('💰 KIỂM TRA SOL BALANCE:');
  console.log('-'.repeat(50));

  for (const wallet of wallets) {
    try {
      const balance = await connection.getBalance(new PublicKey(wallet.address));
      const solBalance = balance / 1_000_000_000; // Convert lamports to SOL

      console.log(`🔑 ${wallet.name}:`);
      console.log(`   Address: ${wallet.address}`);
      console.log(`   SOL Balance: ${solBalance.toFixed(4)} SOL`);
      console.log(`   Description: ${wallet.description}`);
      console.log();
    } catch (error) {
      console.log(`❌ ${wallet.name}: Error checking balance - ${error.message}`);
      console.log();
    }
  }

  // Check token balances
  console.log('🎮 KIỂM TRA GAME TOKEN BALANCE:');
  console.log('-'.repeat(50));

  for (const account of tokenAccounts) {
    try {
      const tokenAccountInfo = await getAccount(connection, new PublicKey(account.address));
      const tokenBalance = Number(tokenAccountInfo.amount) / 1_000_000; // Assuming 6 decimals

      console.log(`🏦 ${account.name}:`);
      console.log(`   Address: ${account.address}`);
      console.log(`   Game Token Balance: ${tokenBalance.toFixed(2)} tokens`);
      console.log(`   Description: ${account.description}`);
      console.log();
    } catch (error) {
      console.log(`❌ ${account.name}: Token account not found or error - ${error.message}`);
      console.log();
    }
  }

  // Check associated token accounts for each wallet
  console.log('🔗 KIỂM TRA ASSOCIATED TOKEN ACCOUNTS:');
  console.log('-'.repeat(50));

  for (const wallet of wallets) {
    try {
      const ata = await getAssociatedTokenAddress(
        gameTokenMint,
        new PublicKey(wallet.address)
      );

      console.log(`🔑 ${wallet.name} ATA:`);
      console.log(`   ATA Address: ${ata.toString()}`);

      try {
        const tokenAccountInfo = await getAccount(connection, ata);
        const tokenBalance = Number(tokenAccountInfo.amount) / 1_000_000;

        console.log(`   Game Token Balance: ${tokenBalance.toFixed(2)} tokens`);
      } catch (ataError) {
        console.log(`   Status: Associated Token Account chưa được tạo`);
      }

      console.log();
    } catch (error) {
      console.log(`❌ Error checking ATA for ${wallet.name}: ${error.message}`);
      console.log();
    }
  }

  // Summary
  console.log('📊 TÓM TẮT TÌNH TRẠNG VÍ:');
  console.log('-'.repeat(50));

  let totalSol = 0;
  let totalTokens = 0;

  for (const wallet of wallets) {
    try {
      const balance = await connection.getBalance(new PublicKey(wallet.address));
      totalSol += balance / 1_000_000_000;

      // Check ATA balance
      const ata = await getAssociatedTokenAddress(
        gameTokenMint,
        new PublicKey(wallet.address)
      );

      try {
        const tokenAccountInfo = await getAccount(connection, ata);
        totalTokens += Number(tokenAccountInfo.amount) / 1_000_000;
      } catch (ataError) {
        // ATA not found, skip
      }
    } catch (error) {
      // Skip wallet if error
    }
  }

  // Add token account balances
  for (const account of tokenAccounts) {
    try {
      const tokenAccountInfo = await getAccount(connection, new PublicKey(account.address));
      totalTokens += Number(tokenAccountInfo.amount) / 1_000_000;
    } catch (error) {
      // Skip if error
    }
  }

  console.log(`💰 Tổng SOL trong tất cả ví: ${totalSol.toFixed(4)} SOL`);
  console.log(`🎮 Tổng Game Tokens: ${totalTokens.toFixed(2)} tokens`);
  console.log(`📈 Token Distribution Ratio: Game Pool vs Owner`);
  console.log(`   • Game Pool Account: ${tokenAccounts[0].address.substring(0, 8)}...`);
  console.log(`   • Owner Account: ${tokenAccounts[1].address.substring(0, 8)}...`);

  console.log('\n✅ HOÀN THÀNH KIỂM TRA VÍ!');
}

// Run if called directly
if (require.main === module) {
  checkAllWallets().catch(console.error);
}

module.exports = { checkAllWallets };
