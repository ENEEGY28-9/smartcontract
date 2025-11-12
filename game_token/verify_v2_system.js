const { PublicKey } = require('@solana/web3.js');

console.log('🔍 VERIFYING GAME POOL V2 SYSTEM COMPATIBILITY');
console.log('='.repeat(60));

// Expected V2 addresses
const expectedAddresses = {
  programId: 'Do9Bq3c7rSSU4YW32F3mCZekQZo5jdyaBuayqmNGAeTf',
  gameTokenMint: '2AxM2y84vg5rwP7QK7mwmBBZrDnZpXZxKTwU5vvX1FWK',
  ownerAccount: '5BzeVCppuFzyLs5aM1f3n8BatqoUCx9hg5N7288zRSCN',
  gamePoolPDA: '5oU5mv3xjud2kgemjKwm5qK5Ar356rxboxbNmYXhuAJc',
  gamePoolTokenAccount: 'E2z7MS8c7HQLvW35ZdaKz74RNqZ3iTosN7iPBFyzxJHW'
};

console.log('🎯 EXPECTED V2 ADDRESSES:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
Object.entries(expectedAddresses).forEach(([key, value]) => {
  console.log(`${key.padEnd(20)}: ${value}`);
});
console.log();

// Calculate actual V2 addresses
const programId = new PublicKey(expectedAddresses.programId);
const [mintingAuthority] = PublicKey.findProgramAddressSync(
  [Buffer.from("minting_authority")],
  programId
);
const [gamePools] = PublicKey.findProgramAddressSync(
  [Buffer.from("game_pools_v2")],
  programId
);
const [gamePoolsTokenAccount] = PublicKey.findProgramAddressSync(
  [Buffer.from("game_pools_v2_token_account")],
  programId
);

console.log('🔧 CALCULATED V2 ADDRESSES:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Minting Authority    : ${mintingAuthority.toString()}`);
console.log(`Game Pools PDA       : ${gamePools.toString()}`);
console.log(`Token Account        : ${gamePoolsTokenAccount.toString()}`);
console.log();

// Verify addresses match
const verification = {
  gamePoolPDA: gamePools.toString() === expectedAddresses.gamePoolPDA,
  tokenAccount: gamePoolsTokenAccount.toString() === expectedAddresses.gamePoolTokenAccount
};

console.log('✅ VERIFICATION RESULTS:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Game Pool PDA Match   : ${verification.gamePoolPDA ? '✅' : '❌'} ${verification.gamePoolPDA ? 'OK' : 'MISMATCH'}`);
console.log(`Token Account Match   : ${verification.tokenAccount ? '✅' : '❌'} ${verification.tokenAccount ? 'OK' : 'MISMATCH'}`);

const allVerified = Object.values(verification).every(v => v);

console.log();
if (allVerified) {
  console.log('🎉 SUCCESS: All V2 addresses are correctly calculated and consistent!');
  console.log('💡 System is ready for V2 deployment and testing.');
} else {
  console.log('❌ ERROR: Address mismatch detected!');
  console.log('🔧 Please check smart contract seeds and program ID.');
}

console.log();
console.log('📋 NEXT STEPS FOR FULL SYSTEM VERIFICATION:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('1. ✅ Build smart contract V2');
console.log('2. ✅ Deploy V2 contract to devnet');
console.log('3. ✅ Initialize V2 PDAs');
console.log('4. ✅ Test auto-mint with V2 addresses');
console.log('5. ✅ Verify 80/20 token distribution');
console.log('6. ✅ Run auto-mint scheduler with V2');

console.log();
console.log('🔗 EXPLORER LINKS:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Program V2: https://explorer.solana.com/address/${expectedAddresses.programId}?cluster=devnet`);
console.log(`Game Pool V2: https://explorer.solana.com/address/${expectedAddresses.gamePoolPDA}?cluster=devnet`);
console.log(`Token Account V2: https://explorer.solana.com/address/${expectedAddresses.gamePoolTokenAccount}?cluster=devnet`);
console.log(`Owner Wallet: https://explorer.solana.com/address/${expectedAddresses.ownerAccount}?cluster=devnet`);

export { verification, expectedAddresses };




