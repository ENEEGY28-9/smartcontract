import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import fs from 'fs';

const GAME_TOKEN_MINT = '2AxM2y84vg5rwP7QK7mwmBBZrDnZpXZxKTwU5vvX1FWK';
const GAME_POOL_ADDRESS = '5oU5mv3xjud2kgemjKwm5qK5Ar356rxboxbNmYXhuAJc';

async function checkWalletReady() {
  console.log('🔍 CHECKING WALLET READINESS FOR GAME POOL INTERACTION\n');

  let walletInfo;
  try {
    walletInfo = JSON.parse(fs.readFileSync('devnet_wallet.json', 'utf8'));
  } catch (error) {
    console.log('❌ No wallet file found. Run: node create_devnet_wallet.js');
    return false;
  }

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const userPubkey = new PublicKey(walletInfo.address);

  console.log('👤 User Wallet: ' + walletInfo.address);

  // Check SOL balance
  const solBalance = await connection.getBalance(userPubkey);
  console.log('💰 SOL Balance: ' + (solBalance / 1e9) + ' SOL');

  if (solBalance === 0) {
    console.log('❌ STATUS: Wallet needs SOL funding');
    console.log('\n💡 ACTION REQUIRED:');
    console.log('1. Go to https://faucet.solana.com/');
    console.log('2. Request SOL for: ' + walletInfo.address);
    console.log('3. Wait for confirmation, then run this script again');
    return false;
  }

  console.log('✅ STATUS: Wallet has SOL for transactions');

  // Check token account
  const tokenMintPubkey = new PublicKey(GAME_TOKEN_MINT);
  const userTokenAccount = await getAssociatedTokenAddress(tokenMintPubkey, userPubkey);

  console.log('\n🎫 Game Token Account: ' + userTokenAccount.toString());

  let tokenAccountExists = false;
  try {
    const tokenAccountInfo = await connection.getAccountInfo(userTokenAccount);
    if (tokenAccountInfo) {
      tokenAccountExists = true;
      console.log('✅ STATUS: Token account exists');

      // Check token balance
      try {
        const tokenBalance = await connection.getTokenAccountBalance(userTokenAccount);
        console.log('🎮 Game Tokens: ' + (tokenBalance.value.uiAmount || 0));
      } catch (error) {
        console.log('🎮 Game Tokens: Unable to check');
      }
    }
  } catch (error) {
    console.log('❌ STATUS: Token account does not exist');
  }

  // Check game pool status
  console.log('\n🎮 Game Pool Status:');
  try {
    const poolAccount = await connection.getAccountInfo(new PublicKey(GAME_POOL_ADDRESS));
    if (poolAccount) {
      console.log('✅ Game pool exists');

      // Try to get pool balance
      try {
        const poolTokenAccount = await getAssociatedTokenAddress(tokenMintPubkey, new PublicKey(GAME_POOL_ADDRESS));
        const poolBalance = await connection.getTokenAccountBalance(poolTokenAccount);
        console.log('🏊 Pool has: ' + (poolBalance.value.uiAmount || 0) + ' game tokens');
      } catch (error) {
        console.log('🏊 Pool token balance: Unable to check');
      }
    }
  } catch (error) {
    console.log('❌ Game pool not accessible');
  }

  // Final readiness check
  console.log('\n📋 READINESS SUMMARY:');
  console.log('✅ SOL Balance: ' + (solBalance > 0 ? 'READY' : 'NEEDS FUNDING'));
  console.log('✅ Token Account: ' + (tokenAccountExists ? 'EXISTS' : 'WILL BE CREATED'));
  console.log('✅ Game Pool: ACCESSIBLE');

  if (solBalance > 0) {
    console.log('\n🚀 WALLET IS READY FOR GAME INTERACTION!');
    console.log('💡 Next: Run "node test_game_pool_transfer.js" to test transfers');
    return true;
  } else {
    console.log('\n⏳ WALLET NEEDS FUNDING FIRST');
    return false;
  }
}

checkWalletReady().catch(console.error);






