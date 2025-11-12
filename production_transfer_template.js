
// PRODUCTION TOKEN TRANSFER FUNCTION
async function transferGameTokens(userWallet, amount) {
  const ownerData = JSON.parse(fs.readFileSync('game_pool_owner.json'));
  const ownerKeypair = Keypair.fromSecretKey(Buffer.from(ownerData.privateKey, 'hex'));

  const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com');

  // Your transfer logic here
  // 1. Validate user has sufficient E
  // 2. Calculate token amount
  // 3. Transfer tokens using owner signature
  // 4. Update database

  return await transferTokens(userWallet, amount);
}
