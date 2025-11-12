const { Connection, PublicKey } = require('@solana/web3.js');
const { getAccount } = require('@solana/spl-token');

async function checkGamePoolBalance() {
  console.log('🏦 CHECKING GAME POOL TOKEN BALANCE');
  console.log('====================================');

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const gamePoolTokenAccount = new PublicKey('E2z7MS8c7HQLvW35ZdaKz74RNqZ3iTosN7iPBFyzxJHW');

  console.log('🎯 Game Pool Token Account:');
  console.log('   Address:', gamePoolTokenAccount.toString());
  console.log('   Explorer: https://explorer.solana.com/address/' + gamePoolTokenAccount.toString() + '?cluster=devnet');
  console.log();

  try {
    console.log('📊 Fetching balance...');
    const tokenAccount = await getAccount(connection, gamePoolTokenAccount);
    const balance = Number(tokenAccount.amount) / 1_000_000;

    console.log('✅ GAME POOL TOKEN BALANCE:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`💰 Balance: ${balance} tokens`);
    console.log(`🪙 Token Mint: ${tokenAccount.mint.toString()}`);
    console.log(`👤 Owner: ${tokenAccount.owner.toString()}`);

    if (balance > 0) {
      console.log('\n🎉 Game Pool has tokens!');
      console.log(`📈 Tokens in Game Pool: ${balance}`);

      // Calculate how many cycles this represents
      const tokensPerCycle = 80; // 80 tokens per cycle to game pool
      const cycles = Math.floor(balance / tokensPerCycle);
      console.log(`🔄 Estimated cycles completed: ${cycles}`);
      console.log(`⏰ Expected: ${cycles * 80} tokens from game pool distribution`);
    } else {
      console.log('\n⏳ Game Pool balance is 0 tokens');
      console.log('💡 This means:');
      console.log('   - PDA token account chua duoc khoi tao boi smart contract');
      console.log('   - Hoac chua co transfer nao vao game pool');
      console.log('   - Enhanced scheduler chi simulate, chua transfer thuc te');
    }

  } catch (error) {
    console.log('\n❌ Error checking game pool balance:');
    console.log('   Message:', error.message);
    console.log('\n💡 Possible reasons:');
    console.log('   - Token account chua duoc tao');
    console.log('   - PDA token account khong ton tai');
    console.log('   - Smart contract chua deploy day du');

    // Check if account exists at all
    try {
      const accountInfo = await connection.getAccountInfo(gamePoolTokenAccount);
      if (accountInfo) {
        console.log('   ✅ Account exists but is not a token account');
      } else {
        console.log('   ❌ Account does not exist');
      }
    } catch (e) {
      console.log('   ❌ Cannot check account existence');
    }
  }

  console.log('\n📋 SUMMARY:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 Game Pool Address: E2z7MS8c7HQLvW35ZdaKz74RNqZ3iTosN7iPBFyzxJHW');
  console.log('🔗 Explorer: https://explorer.solana.com/address/E2z7MS8c7HQLvW35ZdaKz74RNqZ3iTosN7iPBFyzxJHW?cluster=devnet');
  console.log('📊 Should receive: 80 tokens per mint cycle (80% distribution)');
  console.log('⏰ Current scheduler: Enhanced 80/20 logic (running in background)');
}

checkGamePoolBalance();




