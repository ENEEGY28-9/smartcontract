const {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} = require('@solana/web3.js');
const {
  TOKEN_PROGRAM_ID,
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAccount,
  getMint,
  getAssociatedTokenAddress,
} = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');

// Load wallet keypair
const keypairPath = path.join(process.env.HOME || process.env.USERPROFILE, '.config', 'solana', 'id.json');
const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
const payer = Keypair.fromSecretKey(new Uint8Array(keypairData));

// Load smart contract binary
const programPath = path.join(__dirname, 'target', 'deploy', 'game_token.so');

async function deployRealSmartContract() {
  console.log('🚀 Deploying REAL Smart Contract (not just token mint)\n');

  // Connect to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  console.log('Wallet public key:', payer.publicKey.toString());
  const balance = await connection.getBalance(payer.publicKey);
  console.log('SOL Balance:', balance / 1e9, 'SOL\n');

  // Check if program binary exists
  if (!fs.existsSync(programPath)) {
    console.error('❌ Smart contract binary not found at:', programPath);
    console.log('Please build the smart contract first with: anchor build');
    return;
  }

  console.log('📦 Found smart contract binary');

  // Calculate program ID from keypair
  const programKeypair = Keypair.generate();
  const programId = programKeypair.publicKey;

  console.log('🎯 Program ID to deploy:', programId.toString());

  try {
    // Load program binary
    const programBinary = fs.readFileSync(programPath);
    console.log('📊 Program size:', programBinary.length, 'bytes');

    // Create program account
    const programAccountBalance = await connection.getMinimumBalanceForRentExemption(programBinary.length);
    console.log('💰 Required balance for program:', programAccountBalance / 1e9, 'SOL');

    // Create transaction to deploy program
    const transaction = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: programId,
        lamports: programAccountBalance,
        space: programBinary.length,
        programId: SystemProgram.programId,
      })
    );

    console.log('📤 Sending deploy transaction...');
    const signature = await sendAndConfirmTransaction(connection, transaction, [payer, programKeypair]);

    console.log('✅ Program account created. Signature:', signature);

    // Now load the program
    console.log('🔄 Loading program binary...');
    // Note: In a real deployment, you'd use the Solana CLI or a proper deployment tool
    // For now, we'll just create the program account

    // Create deployment info
    const deploymentInfo = {
      network: "devnet",
      programId: programId.toString(),
      deployer: payer.publicKey.toString(),
      deploymentTime: new Date().toISOString(),
      status: "program_account_created",
      note: "Smart contract program account created. Full deployment requires Solana CLI."
    };

    // Save deployment info
    fs.writeFileSync('game_token/real_deployment_info.json', JSON.stringify(deploymentInfo, null, 2));
    console.log('💾 Deployment info saved to game_token/real_deployment_info.json');

    console.log('\n✅ SMART CONTRACT DEPLOYMENT INITIATED!');
    console.log('🎯 Program ID:', programId.toString());
    console.log('📝 Status: Program account created');
    console.log('\n⚠️  Note: Full program deployment requires Solana CLI');
    console.log('   Run: solana program deploy target/deploy/game_token.so');

  } catch (error) {
    console.error('❌ Deployment failed:', error);
  }
}

deployRealSmartContract().catch(console.error);










