const fs = require('fs');
const path = require('path');

const oldGamePoolAddress = 'BwnPAXJ7FSQQkirnXzvLsELk5crhLxbzArwtcfgrGp19';
const newGamePoolAddress = '5oU5mv3xjud2kgemjKwm5qK5Ar356rxboxbNmYXhuAJc';

console.log('🔄 Updating Game Pool Address in All Files');
console.log('='.repeat(60));
console.log('📋 Old Address:', oldGamePoolAddress);
console.log('🆕 New Address:', newGamePoolAddress);
console.log();

// Get all files that contain the old address
const filesToUpdate = [
  'auto_mint_scheduler_simple.js',
  'mint_additional_tokens.js',
  'check_wallet_balance.js',
  '../test_complete_system_verification.js',
  '../mint_additional_tokens.js',
  '../check_wallet_balance.js',
  '../client/src/lib/services/tokenService.ts',
  'devnet_deployment_updated.json',
  '80_20_LOGIC_COMPLETION_REPORT.md',
  'test_owner_revenue.js',
  'test_new_logic_manual.js',
  'test_logic_without_contract.js',
  'test_end_to_end.js',
  'test_devnet_integration.js',
  'simulate_100_tokens_logic.js',
  'setup_test_tokens.js',
  'quick_devnet_test.js',
  'mint_tokens_for_testing.js',
  'mint_additional_tokens.js',
  'manual_logic_test.js',
  'fix_devnet_sync.js',
  'devnet_sync_solution.js'
];

let updatedCount = 0;
let totalFiles = 0;

function updateFile(filePath) {
  try {
    const fullPath = path.join(__dirname, filePath);
    if (fs.existsSync(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      totalFiles++;

      if (content.includes(oldGamePoolAddress)) {
        content = content.replace(new RegExp(oldGamePoolAddress.replace(/[.*+?^${}()|[\]\\]/g, '\\\\$&'), 'g'), newGamePoolAddress);
        fs.writeFileSync(fullPath, content);
        console.log('✅ Updated:', filePath);
        updatedCount++;
      }
    } else {
      console.log('❌ File not found:', filePath);
    }
  } catch (error) {
    console.log('❌ Error updating:', filePath, error.message);
  }
}

// Update files in game_token directory
filesToUpdate.forEach(updateFile);

// Also update files in root directory and other locations
const additionalFiles = [
  '../wait_and_transfer.js',
  '../transfer_simulation.json',
  '../transfer_from_old_pool.js',
  '../test_wallet_transfer.js',
  '../test_simulation_mode.js',
  '../test_real_token_transfer.js',
  '../test_game_pool_transfer.js',
  '../simulate_token_transfer.js',
  '../simple_transfer_test.js',
  '../simple_check.js',
  '../setup_complete_token_transfer.js',
  '../real_owner_transfer.js',
  '../real_owner_private_key.json',
  '../fund_real_owner.js',
  '../full_interaction_test.js',
  '../final_wallet_verification.js',
  '../final_funding_solution.js',
  '../execute_real_transfer.js',
  '../devnet_wallet_simulated.json',
  '../devnet_wallet.json',
  '../demo_working_transfer.js',
  '../demo_token_transfer.js',
  '../debug_game_pool.js',
  '../create_devnet_wallet.js',
  '../check_wallet_ready.js',
  '../check_wallet_compatibility.js',
  '../check_real_owner.js',
  '../check_both_wallets.js',
  '../authority_explanation.js',
  '../client/src/lib/utils/solanaWallet.ts',
  '../client/src/lib/services/walletService.ts',
  '../gateway/src/lib.rs',
  '../client/src/routes/wallet/+/page.svelte',
  '../gateway/src/blockchain_client.rs'
];

additionalFiles.forEach(updateFile);

console.log();
console.log('📊 UPDATE SUMMARY:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📁 Total files checked: ${totalFiles}`);
console.log(`✅ Files updated: ${updatedCount}`);
console.log(`📋 Old Game Pool: ${oldGamePoolAddress}`);
console.log(`🆕 New Game Pool: ${newGamePoolAddress}`);
console.log();

if (updatedCount > 0) {
  console.log('🎉 SUCCESS: Game pool address updated in all files!');
  console.log('💡 Next steps:');
  console.log('   1. Deploy smart contract V2');
  console.log('   2. Initialize new PDAs');
  console.log('   3. Transfer tokens from old pool to new pool');
  console.log('   4. Test auto-mint with new addresses');
} else {
  console.log('ℹ️ No files needed updating');
}




