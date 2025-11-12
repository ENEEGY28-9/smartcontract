const { PublicKey } = require('@solana/web3.js');

const programId = new PublicKey('Do9Bq3c7rSSU4YW32F3mCZekQZo5jdyaBuayqmNGAeTf');

console.log('🔄 Calculating New PDA Addresses for Game Token V2');
console.log('='.repeat(60));
console.log('📋 Program ID:', programId.toString());
console.log();

// Calculate new PDAs with V2 seeds
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

// Game Token Mint (keeping same)
const gameTokenMint = new PublicKey('2AxM2y84vg5rwP7QK7mwmBBZrDnZpXZxKTwU5vvX1FWK');

console.log('🎯 NEW PDA ADDRESSES (V2):');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🏦 Minting Authority:', mintingAuthority.toString());
console.log('🎮 Game Pools PDA:', gamePools.toString());
console.log('💰 Game Pools Token Account:', gamePoolsTokenAccount.toString());
console.log('🪙 Game Token Mint:', gameTokenMint.toString());
console.log();

console.log('🔗 Explorer Links:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Minting Authority: https://explorer.solana.com/address/' + mintingAuthority.toString() + '?cluster=devnet');
console.log('Game Pools PDA: https://explorer.solana.com/address/' + gamePools.toString() + '?cluster=devnet');
console.log('Token Account: https://explorer.solana.com/address/' + gamePoolsTokenAccount.toString() + '?cluster=devnet');
console.log();

console.log('📝 So sánh với V1:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const oldProgramId = new PublicKey('Do9Bq3c7rSSU4YW32F3mCZekQZo5jdyaBuayqmNGAeTe');
const [oldGamePools] = PublicKey.findProgramAddressSync(
  [Buffer.from("game_pools")],
  oldProgramId
);
const [oldGamePoolsTokenAccount] = PublicKey.findProgramAddressSync(
  [Buffer.from("game_pools_token_account")],
  oldProgramId
);

console.log('V1 Game Pools: ', oldGamePools.toString());
console.log('V2 Game Pools: ', gamePools.toString());
console.log('V1 Token Account:', oldGamePoolsTokenAccount.toString());
console.log('V2 Token Account:', gamePoolsTokenAccount.toString());
console.log();

console.log('✅ Game Pools PDA mới đã được tạo thành công!');
console.log('💡 Bây giờ bạn có thể deploy smart contract V2 và sử dụng địa chỉ mới.');




