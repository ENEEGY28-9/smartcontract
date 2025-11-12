import { Keypair } from '@solana/web3.js';
import fs from 'fs';

const REAL_OWNER_ADDRESS = '8WU639hdEB5HWu83nvC5q9cj3zRaxRLDGtRGaJpMk95U';

console.log('🔑 GENERATING KEYPAR FOR REAL OWNER');
console.log('='.repeat(50));
console.log('🎯 Address:', REAL_OWNER_ADDRESS);
console.log('');

console.log('⚠️  IMPORTANT NOTES:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('• This generates a NEW keypair (for testing only)');
console.log('• Real private key is needed for production');
console.log('• This is for demonstration of transfer logic');
console.log('• Generated keys are not the real owner keys');
console.log('');

// Generate a test keypair
const testKeypair = Keypair.generate();

const keypairData = {
  publicKey: testKeypair.publicKey.toString(),
  privateKey: Array.from(testKeypair.secretKey),
  note: 'Test keypair for demonstrating transfer logic',
  warning: 'NOT THE REAL PRIVATE KEY - FOR TESTING ONLY',
  realOwnerAddress: REAL_OWNER_ADDRESS,
  created: new Date().toISOString()
};

fs.writeFileSync('test_real_owner_keypair.json', JSON.stringify(keypairData, null, 2));

console.log('✅ Generated test keypair');
console.log('📄 Saved to: test_real_owner_keypair.json');
console.log('');
console.log('🔐 Generated Public Key:', testKeypair.publicKey.toString());
console.log('⚠️  This is NOT the real owner!');
console.log('');
console.log('💡 FOR REAL TRANSFERS:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('1. Get actual private key of:', REAL_OWNER_ADDRESS);
console.log('2. Use that keypair for signing');
console.log('3. Transfer will work with correct authority');
console.log('');
console.log('🎯 DEMONSTRATION COMPLETE');
console.log('The system is ready for token transfers!');




