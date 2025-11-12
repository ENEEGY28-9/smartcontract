import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount } from '@solana/spl-token';

async function checkWalletBalance() {
  console.log('🔍 Checking Your Token Balances on Devnet...\n');

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Updated addresses with 80/20 logic
  const gameTokenMint = new PublicKey('2AxM2y84vg5rwP7QK7mwmBBZrDnZpXZxKTwU5vvX1FWK');
  const gamePoolAccount = new PublicKey('5oU5mv3xjud2kgemjKwm5qK5Ar356rxboxbNmYXhuAJc');
  const ownerAccount = new PublicKey('5BzeVCppuFzyLs5aM1f3n8BatqoUCx9hg5N7288zRSCN');

  try {
    console.log('📍 Token Addresses:');
    console.log(`Game Token Mint: ${gameTokenMint.toString()}`);
    console.log(`Game Pool: ${gamePoolAccount.toString()}`);
    console.log(`Owner Wallet: ${ownerAccount.toString()}\n`);

    console.log('💰 Checking Balances...\n');

    // Check balances
    const gameBalance = Number((await getAccount(connection, gamePoolAccount)).amount) / 1_000_000;
    const ownerBalance = Number((await getAccount(connection, ownerAccount)).amount) / 1_000_000;

    console.log(`🏦 Game Pool Balance: ${gameBalance} tokens`);
    console.log(`👤 Owner Wallet Balance: ${ownerBalance} tokens`);
    console.log(`📊 Total Tokens Minted: ${gameBalance + ownerBalance} tokens\n`);

    // Verify distribution
    const total = gameBalance + ownerBalance;
    const gamePercentage = (gameBalance / total * 100).toFixed(1);
    const ownerPercentage = (ownerBalance / total * 100).toFixed(1);

    console.log('🔍 Distribution Analysis:');
    console.log(`Game Pool: ${gamePercentage}% (${gameBalance} tokens)`);
    console.log(`Owner Wallet: ${ownerPercentage}% (${ownerBalance} tokens)`);

    if (gamePercentage === '80.0' && ownerPercentage === '20.0') {
      console.log('✅ Distribution: CORRECT (80/20)');
    } else {
      console.log('⚠️ Distribution: Needs verification');
    }

    console.log('\n🎯 Links to check on Explorer:');
    console.log(`Game Token Mint: https://explorer.solana.com/address/${gameTokenMint.toString()}?cluster=devnet`);
    console.log(`Owner Wallet: https://explorer.solana.com/address/${ownerAccount.toString()}?cluster=devnet`);

  } catch (error) {
    console.error('❌ Error checking balances:', error.message);
  }
}

if (require.main === module) {
  checkWalletBalance().catch(console.error);
}
