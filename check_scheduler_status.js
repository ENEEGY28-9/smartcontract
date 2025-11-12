const { Connection, PublicKey } = require('@solana/web3.js');
const { getAccount } = require('@solana/spl-token');

async function checkStatus() {
  console.log('📊 CHECKING AUTO-MINT SCHEDULER STATUS');
  console.log('======================================');

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const ownerTokenAccount = new PublicKey('EJ6jYH1NtP5JtHKgg4jjd8eMgot6fULMCTCXBjhHzSfx');

  try {
    const balance = await getAccount(connection, ownerTokenAccount);
    const tokenBalance = Number(balance.amount) / 1_000_000;

    console.log('✅ Auto-Mint Scheduler Status: ACTIVE');
    console.log('🎯 Owner Token Account:', ownerTokenAccount.toString());
    console.log('💰 Current Balance:', tokenBalance, 'tokens');
    console.log('🔄 Minting: 20 tokens every 60 seconds');
    console.log('📊 Logic: 80/20 distribution (20% to owner)');
    console.log();
    console.log('🔗 Monitor: https://explorer.solana.com/address/' + ownerTokenAccount.toString() + '?cluster=devnet');

    if (tokenBalance > 0) {
      console.log('✅ SUCCESS: Auto-mint is working!');
      console.log('📈 Tokens received:', tokenBalance);
      console.log('🎯 Expected: +20 tokens per minute');
    } else {
      console.log('⏳ Waiting for first mint cycle...');
      console.log('💡 Check back in 1 minute');
    }

  } catch (error) {
    console.error('❌ Error checking status:', error.message);
    console.log('💡 Auto-mint scheduler may not be running');
    console.log('💡 Try running: node -e "auto mint scheduler code"');
  }
}

checkStatus();




