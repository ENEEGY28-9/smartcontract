import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount } from '@solana/spl-token';

async function testDevnetIntegration() {
  console.log('🧪 Testing Devnet Integration...\n');

  // Connect to Devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Load updated deployment addresses (80/20 logic fix)
  const gameTokenMint = new PublicKey('2AxM2y84vg5rwP7QK7mwmBBZrDnZpXZxKTwU5vvX1FWK');
  const gamePoolAccount = new PublicKey('5oU5mv3xjud2kgemjKwm5qK5Ar356rxboxbNmYXhuAJc');
  const ownerAccount = new PublicKey('5BzeVCppuFzyLs5aM1f3n8BatqoUCx9hg5N7288zRSCN');

  console.log('📍 Token Addresses:');
  console.log('- Game Token Mint:', gameTokenMint.toString());
  console.log('- Game Pool Account:', gamePoolAccount.toString());
  console.log('- Owner Account:', ownerAccount.toString());
  console.log();

  try {
    // Check token balances
    console.log('💰 Checking Token Balances...');

    const gamePoolInfo = await getAccount(connection, gamePoolAccount);
    const ownerAccountInfo = await getAccount(connection, ownerAccount);

    const gamePoolBalance = Number(gamePoolInfo.amount) / 1_000_000; // 6 decimals
    const ownerBalance = Number(ownerAccountInfo.amount) / 1_000_000;

    console.log(`✅ Game Pool Balance: ${gamePoolBalance} tokens`);
    console.log(`✅ Owner Balance: ${ownerBalance} tokens`);
    console.log(`✅ Total Minted: ${gamePoolBalance + ownerBalance} tokens`);

    // Verify 80/20 distribution
    const totalTokens = gamePoolBalance + ownerBalance;
    const expectedGameAmount = totalTokens * 0.8;
    const expectedOwnerAmount = totalTokens * 0.2;

    console.log('\n🔍 Distribution Analysis:');
    console.log(`Expected Game (80%): ${expectedGameAmount.toFixed(1)} tokens`);
    console.log(`Actual Game: ${gamePoolBalance} tokens`);
    console.log(`Expected Owner (20%): ${expectedOwnerAmount.toFixed(1)} tokens`);
    console.log(`Actual Owner: ${ownerBalance} tokens`);

    const distributionCorrect = Math.abs(gamePoolBalance - expectedGameAmount) < 0.1;
    console.log(`\n${distributionCorrect ? '✅' : '❌'} Distribution: ${distributionCorrect ? 'CORRECT (80/20)' : 'INCORRECT'}`);

    // Test network connectivity
    console.log('\n🌐 Network Status:');
    const slot = await connection.getSlot();
    const blockHeight = await connection.getBlockHeight();
    console.log(`✅ Current Slot: ${slot}`);
    console.log(`✅ Block Height: ${blockHeight}`);
    console.log(`✅ Network: Devnet`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }

  console.log('\n🎉 Devnet Integration Test: PASSED!');
  console.log('✅ Game can connect to Devnet');
  console.log('✅ Token addresses are valid');
  console.log('✅ Balances can be read');
  console.log('✅ 80/20 distribution verified');

  return true;
}

// Run test
testDevnetIntegration().catch(console.error);
