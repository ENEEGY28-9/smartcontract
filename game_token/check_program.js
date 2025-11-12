const { Connection, PublicKey } = require('@solana/web3.js');

async function checkProgram() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const programId = new PublicKey('Do9Bq3c7rSSU4YW32F3mCZekQZo5jdyaBuayqmNGAeTf');

  try {
    const accountInfo = await connection.getAccountInfo(programId);
    if (accountInfo) {
      console.log('✅ Program exists on devnet!');
      console.log('Program size:', accountInfo.data.length, 'bytes');
      console.log('Owner:', accountInfo.owner.toString());
      console.log('Executable:', accountInfo.executable);
    } else {
      console.log('❌ Program does not exist on devnet');
    }
  } catch (error) {
    console.log('❌ Error checking program:', error.message);
  }
}

checkProgram();



