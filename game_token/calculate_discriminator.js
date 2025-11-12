const crypto = require('crypto');

// Calculate discriminator for player_claim_tokens
const instructionName = 'global:player_claim_tokens';
const hash = crypto.createHash('sha256').update(instructionName).digest();
const discriminator = hash.slice(0, 8);

console.log('Instruction:', instructionName);
console.log('SHA256:', hash.toString('hex'));
console.log('Discriminator (first 8 bytes):', discriminator.toString('hex'));
console.log('As array:', Array.from(discriminator));



