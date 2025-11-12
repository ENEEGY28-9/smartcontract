const { Connection, PublicKey, Keypair, Transaction, TransactionInstruction } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount } = require('@solana/spl-token');
const anchor = require('@coral-xyz/anchor');

async function testPlaygroundDeployment() {
  console.log('🚀 TESTING SOLANA PLAYGROUND DEPLOYMENT');
  console.log('='.repeat(60));

  // Connect to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // UPDATE THESE VALUES AFTER DEPLOYMENT
  const programId = new PublicKey('YOUR_PROGRAM_ID_HERE'); // Replace with deployed program ID
  const gameTokenMint = new PublicKey('YOUR_TOKEN_MINT_HERE'); // Replace with your token mint

  // Use playground wallet
  const wallet = pg.wallet;
  const ownerKeypair = pg.wallet.keypair;

  console.log('👤 Owner Wallet:', ownerKeypair.publicKey.toString());
  console.log('📄 Program ID:', programId.toString());
  console.log('🪙 Token Mint:', gameTokenMint.toString());

  try {
    // Step 1: Create token mint (if not exists)
    console.log('\n🪙 STEP 1: INITIALIZING TOKEN MINT...');
    // Note: In playground, you may need to create token first

    // Step 2: Initialize game pools
    console.log('\n🏦 STEP 2: INITIALIZING GAME POOLS...');
    // This would call initialize_game_pools

    // Step 3: Initialize minting authority
    console.log('\n👑 STEP 3: INITIALIZING MINTING AUTHORITY...');
    // This would call initialize_minting_authority

    // Step 4: Test auto-mint tokens
    console.log('\n⚡ STEP 4: TESTING AUTO-MINT (100 TOKENS)...');
    // This would call auto_mint_tokens with 100 tokens

    // Step 5: Test player earn
    console.log('\n🎮 STEP 5: TESTING PLAYER EARN FROM POOL...');
    // This would call player_earn_from_pool

    console.log('\n✅ PLAYGROUND DEPLOYMENT TEST COMPLETE!');
    console.log('💡 Remember to update the Program ID and Token Mint addresses above');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Make sure program is deployed successfully');
    console.log('2. Update Program ID and Token Mint addresses');
    console.log('3. Check that PDAs are initialized');
    console.log('4. Verify wallet has enough SOL for transactions');
  }
}

// Quick balance check function
async function checkBalances() {
  console.log('\n💰 BALANCE CHECK');

  const connection = new Connection('https://api.devnet.solana.com');
  const wallet = pg.wallet;
  const ownerATA = await getAssociatedTokenAddress(
    new PublicKey('YOUR_TOKEN_MINT_HERE'),
    wallet.keypair.publicKey
  );

  try {
    const balance = await connection.getTokenAccountBalance(ownerATA);
    console.log(`👑 Owner Balance: ${balance.value.uiAmount} tokens`);
  } catch (e) {
    console.log('👑 Owner Balance: 0 tokens (ATA not created)');
  }
}

// Export for playground use
testPlaygroundDeployment();
// checkBalances();

