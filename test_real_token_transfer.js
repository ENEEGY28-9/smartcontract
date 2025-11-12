import { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction, TOKEN_PROGRAM_ID, getTokenAccountBalance } from '@solana/spl-token';
import fs from 'fs';

const GAME_POOL = '5oU5mv3xjud2kgemjKwm5qK5Ar356rxboxbNmYXhuAJc';
const GAME_TOKEN_MINT = '2AxM2y84vg5rwP7QK7mwmBBZrDnZpXZxKTwU5vvX1FWK';
const USER_WALLET = '4UkWvx2Y59XSuhaCfeYDS56RM1WcsSdgjJ7yzLEbMyNf';

async function testRealTokenTransfer() {
  console.log('🧪 TESTING REAL TOKEN TRANSFER FROM GAME POOL');
  console.log('='.repeat(60));

  console.log('📤 SOURCE: Game Pool -', GAME_POOL);
  console.log('📥 DESTINATION: User Wallet -', USER_WALLET);
  console.log('🪙 TOKEN: Game Token -', GAME_TOKEN_MINT);
  console.log('💰 Pool Balance: 2288 tokens (reported)');
  console.log('');

  // Load owner keypair
  let ownerData;
  try {
    ownerData = JSON.parse(fs.readFileSync('game_pool_owner.json', 'utf8'));
    console.log('✅ Owner keypair loaded:', ownerData.publicKey);
  } catch (error) {
    console.error('❌ Owner keypair not found. Run: node setup_complete_token_transfer.js');
    return;
  }

  const ownerKeypair = Keypair.fromSecretKey(Buffer.from(ownerData.privateKey, 'hex'));

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Check prerequisites
  console.log('1️⃣ CHECKING PREREQUISITES...');

  // Check owner SOL balance
  const ownerBalance = await connection.getBalance(ownerKeypair.publicKey);
  console.log('   💰 Owner SOL Balance:', (ownerBalance / 1e9).toFixed(4), 'SOL');

  if (ownerBalance < 5000) {
    console.log('   ❌ INSUFFICIENT SOL: Owner needs at least 0.000005 SOL for fees');
    console.log('   💡 Fund owner wallet first:', ownerData.publicKey);
    console.log('   🌐 Faucet: https://faucet.solana.com/');
    return;
  }

  // Check pool token balance
  const poolPubkey = new PublicKey(GAME_POOL);
  let poolTokenBalance;
  try {
    poolTokenBalance = await getTokenAccountBalance(connection, poolPubkey);
    console.log('   🎮 Game Pool Tokens:', poolTokenBalance.value.uiAmount || 0);
  } catch (error) {
    console.log('   ❌ Cannot access game pool balance');
    console.error('   Error:', error.message);
    return;
  }

  if ((poolTokenBalance.value.uiAmount || 0) === 0) {
    console.log('   ❌ EMPTY POOL: No tokens to transfer');
    return;
  }

  console.log('   ✅ Prerequisites OK\n');

  // Setup transfer
  console.log('2️⃣ SETTING UP TRANSFER...');

  const userPubkey = new PublicKey(USER_WALLET);
  const tokenMintPubkey = new PublicKey(GAME_TOKEN_MINT);

  // Get user token account
  const userTokenAccount = await getAssociatedTokenAddress(tokenMintPubkey, userPubkey);
  console.log('   🎫 User Token Account:', userTokenAccount.toString());

  // Check if user token account exists
  let userTokenAccountExists = false;
  try {
    await connection.getAccountInfo(userTokenAccount);
    userTokenAccountExists = true;
    console.log('   ✅ User token account exists');

    // Check current user balance
    const userCurrentBalance = await getTokenAccountBalance(connection, userTokenAccount);
    console.log('   👤 Current User Tokens:', userCurrentBalance.value.uiAmount || 0);

  } catch (error) {
    console.log('   📝 User token account does not exist - will create');
  }

  // Transfer amount: 1 token as requested
  const transferAmount = 1;
  console.log('   📋 Transfer Amount: 1 token\n');

  // Create token account if needed
  const instructions = [];

  if (!userTokenAccountExists) {
    console.log('3️⃣ CREATING USER TOKEN ACCOUNT...');
    const createAccountIx = createAssociatedTokenAccountInstruction(
      ownerKeypair.publicKey, // payer
      userTokenAccount,
      userPubkey, // owner
      tokenMintPubkey
    );
    instructions.push(createAccountIx);
    console.log('   ✅ Added create account instruction\n');
  }

  // Add transfer instruction
  console.log('4️⃣ CREATING TRANSFER INSTRUCTION...');
  const transferIx = createTransferInstruction(
    poolPubkey, // source
    userTokenAccount, // destination
    ownerKeypair.publicKey, // authority
    transferAmount, // amount
    [],
    TOKEN_PROGRAM_ID
  );
  instructions.push(transferIx);
  console.log('   ✅ Added transfer instruction\n');

  // Execute transaction
  console.log('5️⃣ EXECUTING TRANSACTION...');

  try {
    const transaction = new Transaction().add(...instructions);
    const signature = await sendAndConfirmTransaction(connection, transaction, [ownerKeypair]);

    console.log('   ✅ TRANSACTION SUCCESSFUL!');
    console.log('   🔗 Transaction Signature:', signature);
    console.log('   🌐 Explorer Link:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    console.log('');

    // Verify results
    console.log('6️⃣ VERIFYING RESULTS...');

    // Check final balances
    try {
      const finalPoolBalance = await getTokenAccountBalance(connection, poolPubkey);
      const finalUserBalance = await getTokenAccountBalance(connection, userTokenAccount);

      console.log('   📊 BALANCE CHANGES:');
      console.log('      🎮 Game Pool: ' + (poolTokenBalance.value.uiAmount || 0) + ' → ' + (finalPoolBalance.value.uiAmount || 0));
      console.log('      👤 User Wallet: ' + (userTokenAccountExists ? await getTokenAccountBalance(connection, userTokenAccount).then(b => b.value.uiAmount || 0) : 0) + ' → ' + (finalUserBalance.value.uiAmount || 0));

      const poolChange = (finalPoolBalance.value.uiAmount || 0) - (poolTokenBalance.value.uiAmount || 0);
      const userChange = (finalUserBalance.value.uiAmount || 0) - (userTokenAccountExists ? await getTokenAccountBalance(connection, userTokenAccount).then(b => b.value.uiAmount || 0) : 0);

      console.log('');
      console.log('   ✅ VERIFICATION:');
      console.log('      Pool decreased by:', poolChange, 'tokens');
      console.log('      User increased by:', userChange, 'tokens');

      if (poolChange === -1 && userChange === 1) {
        console.log('      🎉 PERFECT! Transfer successful!');
      } else {
        console.log('      ⚠️  Unexpected balance changes');
      }

    } catch (error) {
      console.log('   ❌ Could not verify final balances');
      console.error('   Error:', error.message);
    }

    console.log('\n🎊 TEST COMPLETE!');
    console.log('📝 Summary: Successfully transferred 1 token from game pool to user wallet');
    console.log('🔗 Check transaction on Solana Explorer');

  } catch (error) {
    console.error('\n❌ TRANSACTION FAILED:');
    console.error('   Error:', error.message);

    if (error.message.includes('insufficient funds')) {
      console.log('   💡 SOLUTION: Owner wallet needs more SOL');
    } else if (error.message.includes('Invalid account owner')) {
      console.log('   💡 SOLUTION: Wrong owner keypair for game pool');
    } else if (error.message.includes('Account does not exist')) {
      console.log('   💡 SOLUTION: Game pool or token account not found');
    } else {
      console.log('   💡 SOLUTION: Check all addresses and try again');
    }
  }
}

testRealTokenTransfer();




