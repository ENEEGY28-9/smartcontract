import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount, TOKEN_PROGRAM_ID } from '@solana/spl-token';

const GAME_POOL = '5oU5mv3xjud2kgemjKwm5qK5Ar356rxboxbNmYXhuAJc';
const GAME_TOKEN_MINT = '2AxM2y84vg5rwP7QK7mwmBBZrDnZpXZxKTwU5vvX1FWK';
const OWNER_WALLET = 'A1Tk1KLSkH4dbeS1mKv9CrUKVRuErHGBg6oH9XUD2sLB';

async function debugGamePool() {
  console.log('🔍 DEBUGGING GAME POOL ACCOUNT');
  console.log('='.repeat(50));

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  console.log('🎮 Game Pool Address:', GAME_POOL);
  console.log('🪙 Token Mint:', GAME_TOKEN_MINT);
  console.log('👑 Owner Address:', OWNER_WALLET);
  console.log('');

  try {
    // Check game pool account info
    console.log('1️⃣ CHECKING GAME POOL ACCOUNT...');
    const poolAccount = await connection.getAccountInfo(new PublicKey(GAME_POOL));

    if (!poolAccount) {
      console.log('❌ Game pool account does not exist!');
      return;
    }

    console.log('   ✅ Account exists');
    console.log('   📏 Data length:', poolAccount.data.length, 'bytes');
    console.log('   👤 Owner program:', poolAccount.owner.toString());
    console.log('   💰 Lamports:', poolAccount.lamports);
    console.log('   💵 SOL balance:', (poolAccount.lamports / 1e9).toFixed(4));
    console.log('   🔒 Executable:', poolAccount.executable ? 'Yes' : 'No');
    console.log('');

    // Check if it's a token account
    console.log('2️⃣ CHECKING TOKEN ACCOUNT DATA...');
    try {
      const tokenAccount = await getAccount(connection, new PublicKey(GAME_POOL));
      console.log('   ✅ Is SPL Token Account');
      console.log('   🪙 Token Mint:', tokenAccount.mint.toString());
      console.log('   👤 Token Owner:', tokenAccount.owner.toString());
      console.log('   💰 Token Amount:', tokenAccount.amount.toString());
      console.log('   🔒 Delegate:', tokenAccount.delegate?.toString() || 'None');
      console.log('   🚫 Close Authority:', tokenAccount.closeAuthority?.toString() || 'None');
      console.log('');

      // Verify token mint matches
      if (tokenAccount.mint.toString() !== GAME_TOKEN_MINT) {
        console.log('❌ TOKEN MINT MISMATCH!');
        console.log('   Expected:', GAME_TOKEN_MINT);
        console.log('   Actual:', tokenAccount.mint.toString());
        console.log('');
      } else {
        console.log('✅ Token mint matches');
      }

      // Check owner authority
      if (tokenAccount.owner.toString() !== OWNER_WALLET) {
        console.log('❌ OWNER AUTHORITY MISMATCH!');
        console.log('   Expected owner:', OWNER_WALLET);
        console.log('   Actual owner:', tokenAccount.owner.toString());
        console.log('');
      } else {
        console.log('✅ Owner authority matches');
      }

    } catch (error) {
      console.log('❌ Not a valid SPL token account');
      console.log('   Error:', error.message);

      // Try to decode raw data
      console.log('   📊 Raw account data:');
      console.log('   First 64 bytes:', poolAccount.data.slice(0, 64).toString('hex'));
      console.log('');
    }

    // Check token mint
    console.log('3️⃣ CHECKING TOKEN MINT...');
    try {
      const mintAccount = await getAccount(connection, new PublicKey(GAME_TOKEN_MINT));
      console.log('   ✅ Token mint exists');
      console.log('   💰 Total supply:', mintAccount.amount.toString());
      console.log('   👑 Mint authority:', mintAccount.mintAuthority?.toString() || 'None');
      console.log('   🚫 Freeze authority:', mintAccount.freezeAuthority?.toString() || 'None');
      console.log('');
    } catch (error) {
      console.log('❌ Token mint error:', error.message);
      console.log('');
    }

    // Check owner wallet
    console.log('4️⃣ CHECKING OWNER WALLET...');
    const ownerBalance = await connection.getBalance(new PublicKey(OWNER_WALLET));
    console.log('   💰 SOL Balance:', (ownerBalance / 1e9).toFixed(4), 'SOL');
    console.log('');

    // Analyze the error
    console.log('5️⃣ ANALYZING TRANSFER ERROR...');
    console.log('Error: "InvalidAccountData"');
    console.log('Possible causes:');
    console.log('• Game pool is not a valid token account');
    console.log('• Wrong token mint');
    console.log('• Owner authority mismatch');
    console.log('• Account data corrupted');
    console.log('');

    // Provide solutions
    console.log('🔧 POSSIBLE SOLUTIONS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('1. Verify Game Pool Address:');
    console.log('   🌐 https://explorer.solana.com/address/', GAME_POOL, '?cluster=devnet');
    console.log('');

    console.log('2. Check Token Mint:');
    console.log('   🪙 Mint:', GAME_TOKEN_MINT);
    console.log('   🌐 https://explorer.solana.com/address/', GAME_TOKEN_MINT, '?cluster=devnet');
    console.log('');

    console.log('3. Verify Owner:');
    console.log('   👑 Owner:', OWNER_WALLET);
    console.log('   🌐 https://explorer.solana.com/address/', OWNER_WALLET, '?cluster=devnet');
    console.log('');

    console.log('4. Check if this is the correct game pool account');
    console.log('5. Verify token creation process');
    console.log('');

  } catch (error) {
    console.error('❌ Debug error:', error.message);
  }
}

// Run debug
debugGamePool().catch(console.error);




