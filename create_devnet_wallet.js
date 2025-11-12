import { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import fs from 'fs';

// Game Pool Configuration
const GAME_POOL_ADDRESS = '5oU5mv3xjud2kgemjKwm5qK5Ar356rxboxbNmYXhuAJc';
const GAME_TOKEN_MINT = '2AxM2y84vg5rwP7QK7mwmBBZrDnZpXZxKTwU5vvX1FWK';

async function createDevnetWallet() {
  console.log('🚀 Creating Devnet Wallet for Game Pool Testing\n');

  // Connect to Devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  console.log('✅ Connected to Solana Devnet');

  // Generate new wallet
  const wallet = Keypair.generate();
  const walletAddress = wallet.publicKey.toString();
  const privateKey = Buffer.from(wallet.secretKey).toString('hex');

  console.log('🎯 New Devnet Wallet Generated:');
  console.log(`📧 Address: ${walletAddress}`);
  console.log(`🔑 Private Key (hex): ${privateKey}`);
  console.log(`🔗 Explorer: https://explorer.solana.com/address/${walletAddress}?cluster=devnet\n`);

  // Check initial balance
  try {
    const balance = await connection.getBalance(wallet.publicKey);
    console.log(`💰 Initial Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
  } catch (error) {
    console.log('❌ Could not get balance:', error.message);
  }

  // Save wallet info to file
  const walletInfo = {
    address: walletAddress,
    privateKey: privateKey,
    publicKey: walletAddress,
    created: new Date().toISOString(),
    network: 'devnet',
    gamePool: GAME_POOL_ADDRESS,
    gameTokenMint: GAME_TOKEN_MINT
  };

  fs.writeFileSync('devnet_wallet.json', JSON.stringify(walletInfo, null, 2));
  console.log('💾 Wallet info saved to devnet_wallet.json\n');

  // Instructions for user
  console.log('📝 Next Steps:');
  console.log('1. Get SOL from faucet: https://faucet.solana.com/');
  console.log('2. Fund your wallet with SOL');
  console.log('3. Run transfer test: node test_game_pool_transfer.js');
  console.log('\n⚠️  SECURITY WARNING:');
  console.log('- Never share your private key');
  console.log('- This is for testing only on Devnet');
  console.log('- Use real wallet software in production\n');

  return walletInfo;
}

async function testGamePoolInteraction() {
  console.log('🧪 Testing Game Pool Interaction\n');

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  try {
    // Check game pool account
    const gamePoolPubkey = new PublicKey(GAME_POOL_ADDRESS);
    console.log(`🎮 Game Pool Address: ${GAME_POOL_ADDRESS}`);

    // Check if it's a system account (SOL wallet) or token account
    const accountInfo = await connection.getAccountInfo(gamePoolPubkey);

    if (accountInfo) {
      console.log('✅ Game Pool account exists');

      // If it has data, it might be a token account
      if (accountInfo.data.length > 0) {
        console.log('📄 Account has data (likely token account)');
        console.log(`📏 Data length: ${accountInfo.data.length} bytes`);
      } else {
        console.log('💰 Account is likely a SOL wallet');
        const balance = await connection.getBalance(gamePoolPubkey);
        console.log(`💵 SOL Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
      }

      console.log(`👤 Owner: ${accountInfo.owner.toString()}`);
      console.log(`💾 Executable: ${accountInfo.executable}`);
    } else {
      console.log('❌ Game Pool account does not exist');
    }

    // Check token mint
    try {
      const tokenMintPubkey = new PublicKey(GAME_TOKEN_MINT);
      const tokenSupply = await connection.getTokenSupply(tokenMintPubkey);
      console.log(`\n🪙 Game Token Mint: ${GAME_TOKEN_MINT}`);
      console.log(`📊 Total Supply: ${tokenSupply.value.uiAmount} tokens`);
    } catch (error) {
      console.log(`❌ Could not get token info: ${error.message}`);
    }

  } catch (error) {
    console.log(`❌ Error testing game pool: ${error.message}`);
  }
}

// Main execution
async function main() {
  try {
    await createDevnetWallet();
    await testGamePoolInteraction();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run main function when script is executed directly
main().catch(console.error);

export { createDevnetWallet, testGamePoolInteraction };
