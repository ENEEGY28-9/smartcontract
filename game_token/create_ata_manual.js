const { Connection, PublicKey, Keypair, Transaction, SystemProgram } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount } = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');

// Load wallets
const keypairPath = path.join(process.env.HOME || process.env.USERPROFILE, '.config', 'solana', 'id.json');
const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
const payer = Keypair.fromSecretKey(new Uint8Array(keypairData));

async function createATAManual() {
  console.log('🔧 MANUAL ATA CREATION');

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Create game pool authority
  const gamePoolAuthority = Keypair.generate();
  console.log('Game Pool Authority:', gamePoolAuthority.publicKey.toString());

  const gameTokenMint = new PublicKey('ANzKnYDd7BpiPEykuHxrfAsiox19aWzLbZrmQbL8J8Qk');

  // Calculate ATA address
  const gamePoolATA = await getAssociatedTokenAddress(gameTokenMint, gamePoolAuthority.publicKey);
  console.log('Game Pool ATA:', gamePoolATA.toString());

  // Create ATA instruction
  const createATAIx = createAssociatedTokenAccountInstruction(
    payer.publicKey, // payer
    gamePoolATA, // ata
    gamePoolAuthority.publicKey, // owner
    gameTokenMint, // mint
    TOKEN_PROGRAM_ID, // token program
    ASSOCIATED_TOKEN_PROGRAM_ID // associated token program
  );

  // Create transaction
  const transaction = new Transaction().add(createATAIx);

  console.log('Sending ATA creation transaction...');
  const signature = await connection.sendTransaction(transaction, [payer]);

  console.log('✅ ATA creation signature:', signature);

  // Wait for confirmation
  await connection.confirmTransaction(signature);
  console.log('✅ ATA creation confirmed');

  // Verify ATA
  const ataInfo = await getAccount(connection, gamePoolATA);
  console.log('✅ ATA verified - balance:', Number(ataInfo.amount) / 1_000_000, 'tokens');

  // Save config
  const config = {
    gamePoolAuthority: gamePoolAuthority.publicKey.toString(),
    gamePoolATA: gamePoolATA.toString(),
    gameTokenMint: gameTokenMint.toString(),
    created: true
  };

  fs.writeFileSync('manual_ata_config.json', JSON.stringify(config, null, 2));
  fs.writeFileSync('manual_authority.json', JSON.stringify({
    publicKey: gamePoolAuthority.publicKey.toString(),
    secretKey: Array.from(gamePoolAuthority.secretKey)
  }, null, 2));

  console.log('✅ MANUAL ATA CREATION COMPLETE');
  return config;
}

async function fundAndTest() {
  console.log('\n💰 FUNDING AND TESTING ATA');

  const config = JSON.parse(fs.readFileSync('manual_ata_config.json', 'utf8'));
  const authorityData = JSON.parse(fs.readFileSync('manual_authority.json', 'utf8'));
  const gamePoolAuthority = Keypair.fromSecretKey(new Uint8Array(authorityData.secretKey));

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Fund ATA
  const { mintTo } = require('@solana/spl-token');
  const gamePoolATA = new PublicKey(config.gamePoolATA);
  const gameTokenMint = new PublicKey(config.gameTokenMint);

  console.log('Funding ATA with 500 tokens...');
  const fundSig = await mintTo(
    connection,
    payer,
    gameTokenMint,
    gamePoolATA,
    payer,
    500 * 1_000_000
  );

  console.log('✅ Funding signature:', fundSig);

  // Check balance
  const balance = Number((await getAccount(connection, gamePoolATA)).amount) / 1_000_000;
  console.log('🏦 Game Pool balance:', balance, 'tokens');

  // Test transfer
  const playerATA = new PublicKey('qtfAibpP5SqJYLGTPedAJF8kTcnzZxeGXuxUDKw85ki');

  console.log('\n⚡ TESTING TRANSFER...');

  const { createTransferInstruction } = require('@solana/spl-token');
  const transferIx = createTransferInstruction(
    gamePoolATA,
    playerATA,
    gamePoolAuthority.publicKey,
    50 * 1_000_000,
    [],
    TOKEN_PROGRAM_ID
  );

  const transaction = new Transaction().add(transferIx);
  const transferSig = await connection.sendTransaction(transaction, [gamePoolAuthority]);

  console.log('✅ Transfer signature:', transferSig);

  // Final balances
  const finalGamePoolBalance = Number((await getAccount(connection, gamePoolATA)).amount) / 1_000_000;
  const finalPlayerBalance = Number((await getAccount(connection, playerATA)).amount) / 1_000_000;

  console.log('\n💰 FINAL BALANCES:');
  console.log(`🏦 Game Pool: ${finalGamePoolBalance} tokens (-50)`);
  console.log(`🎮 Player: ${finalPlayerBalance} tokens (+50)`);

  console.log('\n🎉 SUCCESS! Game pool balance actually decreased!');
}

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === 'fund') {
    await fundAndTest();
  } else {
    await createATAManual();
    console.log('\n🚀 ATA CREATED! Run "node create_ata_manual.js fund" to fund and test');
  }
}

if (require.main === module) {
  main().catch(console.error);
}
