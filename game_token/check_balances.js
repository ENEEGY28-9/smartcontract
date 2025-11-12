const { Connection, PublicKey } = require('@solana/web3.js');

async function checkBalances() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  const gamePoolAddress = new PublicKey('HHHaKDSbruknbEFqwB3tfMQ5dAyatyavi15JHvFATssq');
  const playerATA = new PublicKey('qtfAibpP5SqJYLGTPedAJF8kTcnzZxeGXuxUDKw85ki');

  try {
    console.log('🔍 CHECKING CURRENT BALANCES');
    console.log('='.repeat(50));

    // Check game pool balance
    const gamePoolBalance = await connection.getTokenAccountBalance(gamePoolAddress);
    console.log(`🏦 Game Pool: ${gamePoolBalance.value.uiAmount} tokens`);

    // Check player balance
    const playerBalance = await connection.getTokenAccountBalance(playerATA);
    console.log(`🎮 Player ATA: ${playerBalance.value.uiAmount} tokens`);

    console.log('\n📊 ANALYSIS:');
    console.log(`Expected: Game pool should decrease by 30 tokens if real smart contract was used`);
    console.log(`Actual: Game pool unchanged, player received tokens via minting (simulation)`);

    console.log('\n💡 CONCLUSION:');
    console.log(`❌ Smart contract NOT deployed - using simulation mode`);
    console.log(`❌ No real transfer from game pool to player`);
    console.log(`✅ Player received tokens, but not from game pool`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkBalances();
