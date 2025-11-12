import { Connection, PublicKey, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import fs from 'fs';

const OLD_OWNER_KEYPAIR_FILE = 'game_pool_owner.json';
const REAL_OWNER_ADDRESS = '8WU639hdEB5HWu83nvC5q9cj3zRaxRLDGtRGaJpMk95U';

async function transferSolToRealOwner() {
  console.log('💸 TRANSFER SOL FROM OLD OWNER TO REAL OWNER');
  console.log('='.repeat(50));

  // Load old owner keypair
  let oldOwnerData;
  try {
    oldOwnerData = JSON.parse(fs.readFileSync(OLD_OWNER_KEYPAIR_FILE, 'utf8'));
    console.log('✅ Loaded old owner keypair');
  } catch (error) {
    console.error('❌ Cannot load old owner keypair:', error.message);
    return;
  }

  console.log('📤 FROM:', oldOwnerData.publicKey);
  console.log('📥 TO:', REAL_OWNER_ADDRESS);
  console.log('');

  // Create keypair from private key
  const oldOwnerKeypair = Keypair.fromSecretKey(Buffer.from(oldOwnerData.privateKey, 'hex'));
  const realOwnerPubkey = new PublicKey(REAL_OWNER_ADDRESS);

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Check current balances
  console.log('1️⃣ CHECKING CURRENT BALANCES...');
  const oldOwnerBalance = await connection.getBalance(oldOwnerKeypair.publicKey);
  const realOwnerBalance = await connection.getBalance(realOwnerPubkey);

  const oldSol = oldOwnerBalance / 1e9;
  const realSol = realOwnerBalance / 1e9;

  console.log('   Old Owner SOL:', oldSol.toFixed(4));
  console.log('   Real Owner SOL:', realSol.toFixed(4));
  console.log('');

  // Calculate transfer amount
  console.log('2️⃣ CALCULATING TRANSFER AMOUNT...');

  // Leave 0.01 SOL for potential future fees
  const reserveAmount = 0.01 * 1e9; // 0.01 SOL in lamports
  const availableAmount = oldOwnerBalance - reserveAmount;

  if (availableAmount <= 0) {
    console.log('❌ Insufficient balance after reserving fees');
    return;
  }

  // Transfer 0.5 SOL or available amount (whichever smaller)
  const transferAmount = Math.min(0.5 * 1e9, availableAmount);
  const transferSol = transferAmount / 1e9;

  console.log('   💰 Transfer amount:', transferSol.toFixed(4), 'SOL');
  console.log('   🔄 Reserve for fees:', (reserveAmount / 1e9).toFixed(4), 'SOL');
  console.log('');

  // Confirm transfer
  console.log('3️⃣ CONFIRMING TRANSFER...');
  console.log('   📤 From:', oldOwnerData.publicKey);
  console.log('   📥 To:', REAL_OWNER_ADDRESS);
  console.log('   💰 Amount:', transferSol.toFixed(4), 'SOL');
  console.log('');

  // Create transfer instruction
  console.log('4️⃣ CREATING TRANSACTION...');
  const transferInstruction = SystemProgram.transfer({
    fromPubkey: oldOwnerKeypair.publicKey,
    toPubkey: realOwnerPubkey,
    lamports: transferAmount,
  });

  const transaction = new Transaction().add(transferInstruction);

  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = oldOwnerKeypair.publicKey;

  console.log('✅ Transaction created');
  console.log('');

  // Sign and send transaction
  console.log('5️⃣ SIGNING AND SENDING TRANSACTION...');
  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [oldOwnerKeypair]
    );

    console.log('✅ TRANSACTION SUCCESSFUL!');
    console.log('🔗 Signature:', signature);
    console.log('🌐 View on explorer:');
    console.log('https://explorer.solana.com/tx/' + signature + '?cluster=devnet');
    console.log('');

    // Verify final balances
    console.log('6️⃣ VERIFYING FINAL BALANCES...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for confirmation

    const finalOldBalance = await connection.getBalance(oldOwnerKeypair.publicKey);
    const finalRealBalance = await connection.getBalance(realOwnerPubkey);

    const finalOldSol = finalOldBalance / 1e9;
    const finalRealSol = finalRealBalance / 1e9;

    console.log('   ✅ Old Owner Final:', finalOldSol.toFixed(4), 'SOL');
    console.log('   ✅ Real Owner Final:', finalRealSol.toFixed(4), 'SOL');
    console.log('');

    console.log('🎉 TRANSFER COMPLETE!');
    console.log('   📈 Real Owner gained:', transferSol.toFixed(4), 'SOL');
    console.log('   🔑 Now has authority + SOL for token transfers!');
    console.log('');

    console.log('🚀 NEXT STEP:');
    console.log('node real_owner_transfer.js');

  } catch (error) {
    console.error('❌ Transaction failed:', error.message);
    console.log('');
    console.log('💡 POSSIBLE ISSUES:');
    console.log('   • Insufficient balance');
    console.log('   • Network congestion');
    console.log('   • Invalid keypair');
  }
}

// Run the transfer
transferSolToRealOwner().catch(console.error);




