const { Connection, PublicKey } = require('@solana/web3.js');
const { getAccount } = require('@solana/spl-token');

async function checkFinalBalances() {
  console.log('🔍 FINAL BALANCE CHECK');
  console.log('='.repeat(40));

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  const playerATA = new PublicKey('qtfAibpP5SqJYLGTPedAJF8kTcnzZxeGXuxUDKw85ki');
  const ownerATA = new PublicKey('4K9tg8tAFMGYCZkSJA3UhC5hizFfkAceoMn6L6gfNiW9');
  const gamePoolAccount = new PublicKey('HHHaKDSbruknbEFqwB3tfMQ5dAyatyavi15JHvFATssq');

  try {
    const playerBalance = Number((await getAccount(connection, playerATA)).amount) / 1_000_000;
    const ownerBalance = Number((await getAccount(connection, ownerATA)).amount) / 1_000_000;
    const gamePoolBalance = Number((await getAccount(connection, gamePoolAccount)).amount) / 1_000_000;

    console.log('🎮 Player ATA (qtfAibpP5SqJYLGTPedAJF8kTcnzZxeGXuxUDKw85ki):', playerBalance, 'tokens');
    console.log('👤 Owner ATA (4K9tg8tAFMGYCZkSJA3UhC5hizFfkAceoMn6L6gfNiW9):', ownerBalance, 'tokens');
    console.log('🏦 Game Pool (HHHaKDSbruknbEFqwB3tfMQ5dAyatyavi15JHvFATssq):', gamePoolBalance, 'tokens');

    console.log('\n📊 SUMMARY:');
    console.log('Total tokens in system:', playerBalance + ownerBalance + gamePoolBalance);
    console.log('Player received 100 tokens:', playerBalance >= 140 ? '✅ CONFIRMED' : '❌ NOT CONFIRMED');

  } catch (error) {
    console.error('❌ Error checking balances:', error.message);
  }
}

checkFinalBalances();



