const { Connection, PublicKey } = require('@solana/web3.js');
const { getAccount } = require('@solana/spl-token');

async function checkBalance() {
  console.log('💰 CHECKING GAME POOL V2 BALANCE BEFORE TEST');
  console.log('='.repeat(60));

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const gamePoolTokenAccount = new PublicKey('E2z7MS8c7HQLvW35ZdaKz74RNqZ3iTosN7iPBFyzxJHW');
  const ownerWallet = new PublicKey('5BzeVCppuFzyLs5aM1f3n8BatqoUCx9hg5N7288zRSCN');

  console.log('🎯 Game Pool V2 Token Account:', gamePoolTokenAccount.toString());
  console.log('👤 Owner Wallet:', ownerWallet.toString());
  console.log('🔗 Explorer: https://explorer.solana.com/address/' + gamePoolTokenAccount.toString() + '?cluster=devnet');
  console.log();

  try {
    console.log('📊 CHECKING BALANCES...');
    const gamePoolBalance = await getAccount(connection, gamePoolTokenAccount);
    const ownerBalance = await getAccount(connection, ownerWallet);

    console.log(`🏦 Game Pool Balance: ${Number(gamePoolBalance.amount) / 1_000_000} tokens`);
    console.log(`👤 Owner Balance: ${Number(ownerBalance.amount) / 1_000_000} tokens`);

    const totalTokens = (Number(gamePoolBalance.amount) + Number(ownerBalance.amount)) / 1_000_000;
    console.log(`📈 Total Tokens in System: ${totalTokens} tokens`);

    console.log();
    console.log('✅ BALANCE CHECK COMPLETE - Ready for testing!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('💡 This likely means the token accounts are not initialized yet');
    console.log('💡 You need to deploy smart contract V2 first');
    console.log('💡 Run: cd game_token && node deploy_v2_contract.js');
  }
}

checkBalance();




