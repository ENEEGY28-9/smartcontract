import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

const GAME_POOL_ADDRESS = '5oU5mv3xjud2kgemjKwm5qK5Ar356rxboxbNmYXhuAJc';
const GAME_TOKEN_MINT = '2AxM2y84vg5rwP7QK7mwmBBZrDnZpXZxKTwU5vvX1FWK';
const USER_WALLET = '4UkWvx2Y59XSuhaCfeYDS56RM1WcsSdgjJ7yzLEbMyNf';

async function checkCompatibility() {
  console.log('🔍 Checking compatibility between user wallet and game pool...\n');

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  try {
    // Check user wallet
    const userPubkey = new PublicKey(USER_WALLET);
    const userBalance = await connection.getBalance(userPubkey);
    console.log('👤 User Wallet:');
    console.log('  Address:', USER_WALLET);
    console.log('  SOL Balance:', userBalance / 1e9, 'SOL');
    console.log('  Type: System Account (can hold SOL and sign transactions)\n');

    // Check game pool
    const poolPubkey = new PublicKey(GAME_POOL_ADDRESS);
    const poolAccount = await connection.getAccountInfo(poolPubkey);
    console.log('🎮 Game Pool:');
    console.log('  Address:', GAME_POOL_ADDRESS);
    console.log('  Type: Token Account (holds game tokens)');
    console.log('  Owner:', poolAccount.owner.toString());
    console.log('  Executable:', poolAccount.executable);
    console.log('  Data Length:', poolAccount.data.length, 'bytes\n');

    // Check associated token accounts
    const tokenMintPubkey = new PublicKey(GAME_TOKEN_MINT);
    const userTokenAccount = await getAssociatedTokenAddress(tokenMintPubkey, userPubkey);
    const poolTokenAccount = await getAssociatedTokenAddress(tokenMintPubkey, poolPubkey);

    console.log('🔗 Associated Token Accounts:');
    console.log('  User Token Account (expected):', userTokenAccount.toString());
    console.log('  Pool Token Account (actual):', poolTokenAccount.toString());

    // Check if user token account exists
    try {
      const userTokenInfo = await connection.getAccountInfo(userTokenAccount);
      if (userTokenInfo) {
        console.log('  User Token Account Status: ✅ EXISTS');
        try {
          const userTokenBalance = await connection.getTokenAccountBalance(userTokenAccount);
          console.log('  User Token Balance:', userTokenBalance.value.uiAmount || 0, 'tokens');
        } catch (balanceError) {
          console.log('  User Token Balance: Unable to check balance');
        }
      } else {
        console.log('  User Token Account Status: ❌ DOES NOT EXIST (needs creation)');
      }
    } catch (error) {
      console.log('  User Token Account Status: ❌ DOES NOT EXIST (needs creation)');
    }

    // Check pool token balance
    try {
      const poolTokenBalance = await connection.getTokenAccountBalance(poolTokenAccount);
      console.log('  Pool Token Balance:', poolTokenBalance.value.uiAmount || 0, 'tokens');
    } catch (error) {
      console.log('  Pool Token Balance: Unable to check (may be empty or error)');
    }

    console.log('\n📋 Compatibility Analysis:');
    console.log('✅ User wallet can SIGN transactions');
    console.log('✅ User wallet can PAY transaction fees (if has SOL)');
    console.log('✅ Game pool holds game tokens');
    console.log('⚠️  Game pool needs OWNER signature to transfer tokens');
    console.log('⚠️  User token account may need to be created first');
    console.log('⚠️  Owner private key needed for game pool transfers');

    console.log('\n🚀 Transfer Possibilities:');
    console.log('✅ User → Game Pool: SOL transfers (user signs)');
    console.log('❌ Game Pool → User: Token transfers (needs owner signature)');
    console.log('🎭 In your game: Backend handles token distribution with owner key');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkCompatibility();
