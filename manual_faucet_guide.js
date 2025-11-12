import { Connection, PublicKey } from '@solana/web3.js';

const USER_WALLET = '4UkWvx2Y59XSuhaCfeYDS56RM1WcsSdgjJ7yzLEbMyNf';

console.log('🪙 MANUAL SOL FUNDING GUIDE');
console.log('==========================\n');

console.log('🎯 TARGET WALLET:');
console.log(USER_WALLET);
console.log('\n📋 COPY THIS ADDRESS FOR FAUCET REQUESTS\n');

console.log('🌐 RECOMMENDED METHOD - QuickNode Faucet:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('1. 🔗 Open: https://faucet.quicknode.com/solana/devnet');
console.log('2. 📝 Paste address:');
console.log('   ' + USER_WALLET);
console.log('3. 🎯 Click: "Send Devnet SOL"');
console.log('4. ⏳ Wait: 10-30 seconds');
console.log('5. ✅ Check: Balance updated\n');

console.log('🌐 ALTERNATIVE - Official Solana Faucet:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('1. 🔗 Open: https://faucet.solana.com/');
console.log('2. 🌍 Select: Devnet (dropdown)');
console.log('3. 📝 Paste address:');
console.log('   ' + USER_WALLET);
console.log('4. 🎯 Click: "Request Airdrop"');
console.log('5. 📊 Select: 1 SOL (recommended)');
console.log('6. ⏳ Wait: 30-60 seconds');
console.log('7. ✅ Check: Balance updated\n');

console.log('🌐 BACKUP - Discord Faucet Bot:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('1. 🔗 Join: https://discord.gg/solana');
console.log('2. 📺 Go to: #devnet-faucet channel');
console.log('3. 💬 Type:');
console.log('   $airdrop ' + USER_WALLET);
console.log('4. 🤖 Bot will send: 1-2 SOL');
console.log('5. ⏳ Wait: Bot response\n');

console.log('🔍 AFTER FUNDING - VERIFICATION:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ Run: node check_wallet_ready.js');
console.log('✅ Expected: "WALLET IS READY FOR GAME INTERACTION!"\n');

console.log('🚀 NEXT STEPS AFTER FUNDING:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('1. ✅ node check_wallet_ready.js');
console.log('2. 🚀 node full_interaction_test.js');
console.log('3. 🎮 Your game E-to-SOL claims will work!\n');

console.log('💡 CURRENT BALANCE CHECK:');

async function checkBalance() {
  try {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const balance = await connection.getBalance(new PublicKey(USER_WALLET));
    const solBalance = (balance / 1e9).toFixed(4);

    console.log('💰 SOL Balance: ' + solBalance + ' SOL');

    if (balance === 0) {
      console.log('❌ STATUS: Needs funding');
      console.log('💡 Please use one of the faucet methods above');
    } else if (balance < 1000000) { // 0.001 SOL
      console.log('⚠️ STATUS: Low balance, may need more SOL');
    } else {
      console.log('✅ STATUS: Sufficient for transactions');
    }
  } catch (error) {
    console.log('❌ Could not check balance:', error.message);
  }
}

checkBalance();






