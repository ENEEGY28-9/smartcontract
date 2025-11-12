const { Connection, PublicKey } = require('@solana/web3.js');
const { getAccount } = require('@solana/spl-token');

async function checkGamePoolBalance() {
  console.log('💰 CHECKING GAME POOL V2 BALANCE');
  console.log('='.repeat(60));

  // Connect to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Game Pool V2 Token Account
  const gamePoolTokenAccount = new PublicKey('E2z7MS8c7HQLvW35ZdaKz74RNqZ3iTosN7iPBFyzxJHW');

  // Owner Wallet (to compare)
  const ownerWallet = new PublicKey('5BzeVCppuFzyLs5aM1f3n8BatqoUCx9hg5N7288zRSCN');

  console.log('🎯 Game Pool V2 Token Account:', gamePoolTokenAccount.toString());
  console.log('👤 Owner Wallet:', ownerWallet.toString());
  console.log();

  try {
    // Check Game Pool balance
    console.log('📊 CHECKING BALANCES...');
    const gamePoolBalance = await getAccount(connection, gamePoolTokenAccount);
    const ownerBalance = await getAccount(connection, ownerWallet);

    console.log(`🏦 Game Pool Balance: ${Number(gamePoolBalance.amount) / 1_000_000} tokens`);
    console.log(`👤 Owner Balance: ${Number(ownerBalance.amount) / 1_000_000} tokens`);

    const totalTokens = (Number(gamePoolBalance.amount) + Number(ownerBalance.amount)) / 1_000_000;
    console.log(`📈 Total Tokens in System: ${totalTokens} tokens`);

    console.log();
    console.log('✅ BALANCE CHECK COMPLETE');

    return {
      gamePool: Number(gamePoolBalance.amount) / 1_000_000,
      owner: Number(ownerBalance.amount) / 1_000_000,
      total: totalTokens
    };

  } catch (error) {
    console.error('❌ Error checking balance:', error.message);
    console.log('💡 This might mean the token accounts are not initialized yet');
    console.log('💡 Try deploying the smart contract V2 first');

    return { error: error.message };
  }
}

// Run check
if (require.main === module) {
  checkGamePoolBalance().catch(console.error);
}

module.exports = { checkGamePoolBalance };




