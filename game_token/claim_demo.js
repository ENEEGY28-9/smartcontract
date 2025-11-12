const { playerClaimTokens } = require('./player_claim_tokens');

// Demo: Player có thể claim số lượng tokens tùy ý
async function demoPlayerClaims() {
  console.log('🎮 PLAYER TOKEN CLAIM DEMO');
  console.log('='.repeat(60));
  console.log('💡 Players can claim any amount of tokens they want');
  console.log('💡 They pay transaction fees themselves');
  console.log('');

  const playerAddress = 'qtfAibpP5SqJYLGTPedAJF8kTcnzZxeGXuxUDKw85ki';

  // Demo different claim amounts
  const claimAmounts = [10, 50, 100, 5];

  for (const amount of claimAmounts) {
    console.log(`\n🎯 CLAIMING ${amount} TOKENS...`);
    console.log('-'.repeat(40));

    try {
      const result = await playerClaimTokens(playerAddress, amount);

      if (result.success) {
        console.log(`✅ SUCCESS: Claimed ${result.claimAmount} tokens`);
        console.log(`💰 New Balance: ${result.playerBalance} tokens`);
        console.log(`💸 Network Fee: ~${result.fee} SOL`);
        console.log(`🔗 Transaction: https://explorer.solana.com/tx/${result.signature}?cluster=devnet`);
      } else {
        console.log(`❌ FAILED: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
    }

    // Wait a bit between claims
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n🎉 DEMO COMPLETE!');
  console.log('💡 Players can claim tokens anytime with any amount');
  console.log('💡 Smart contract ensures game pool has sufficient balance');
  console.log('💡 Players pay their own transaction fees');
}

// API Function for Game Integration
function createClaimAPI() {
  return {
    /**
     * Claim tokens for a player
     * @param {string} playerPublicKey - Player's Solana public key
     * @param {number} amount - Amount of tokens to claim
     * @returns {Promise<Object>} Claim result
     */
    async claimTokens(playerPublicKey, amount) {
      console.log(`🎮 Processing claim request: ${amount} tokens for ${playerPublicKey}`);

      try {
        const result = await playerClaimTokens(playerPublicKey, amount);

        if (result.success) {
          return {
            success: true,
            data: {
              amount: result.claimAmount,
              newBalance: result.playerBalance,
              fee: result.fee,
              transaction: result.signature
            }
          };
        } else {
          return {
            success: false,
            error: result.error
          };
        }
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    },

    /**
     * Get claim history for a player
     * @param {string} playerPublicKey - Player's Solana public key
     * @returns {Array} Array of claim records
     */
    getClaimHistory(playerPublicKey) {
      try {
        const fs = require('fs');
        if (fs.existsSync('player_claim_records.json')) {
          const records = JSON.parse(fs.readFileSync('player_claim_records.json', 'utf8'));
          return records.filter(record => record.player === playerPublicKey);
        }
        return [];
      } catch (error) {
        console.error('Error reading claim history:', error);
        return [];
      }
    }
  };
}

// Export for game integration
module.exports = { createClaimAPI };

// Run demo if called directly
if (require.main === module) {
  demoPlayerClaims().catch(console.error);
}



