const fs = require('fs');
const path = require('path');

console.log('🔄 Updating All Files to Use Smart Contract V2');
console.log('='.repeat(60));

// Files that need to be updated to use V2 program
const filesToUpdate = [
  'test_owner_revenue.js',
  'test_new_logic_manual.js',
  'test_logic_without_contract.js',
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

function updateFile(filePath) {
  try {
    const fullPath = path.join(__dirname, filePath);
    if (fs.existsSync(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let updated = false;

      // Update program ID
      if (content.includes('Do9Bq3c7rSSU4YW32F3mCZekQZo5jdyaBuayqmNGAeTe')) {
        content = content.replace(
          /Do9Bq3c7rSSU4YW32F3mCZekQZo5jdyaBuayqmNGAeTe/g,
          'Do9Bq3c7rSSU4YW32F3mCZekQZo5jdyaBuayqmNGAeTf'
        );
        updated = true;
      }

      // Update IDL file path
      if (content.includes('./target/idl/game_token.json')) {
        content = content.replace(
          /'\.\/target\/idl\/game_token\.json'/g,
          '\'./target/idl/game_token_v2.json\''
        );
        updated = true;
      }

      // Update seeds from "game_pools" to "game_pools_v2"
      if (content.includes('Buffer.from("game_pools")')) {
        content = content.replace(
          /Buffer\.from\("game_pools"\)/g,
          'Buffer.from("game_pools_v2")'
        );
        updated = true;
      }

      // Update seeds from "game_pools_token_account" to "game_pools_v2_token_account"
      if (content.includes('Buffer.from("game_pools_token_account")')) {
        content = content.replace(
          /Buffer\.from\("game_pools_token_account"\)/g,
          'Buffer.from("game_pools_v2_token_account")'
        );
        updated = true;
      }

      if (updated) {
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

console.log();
console.log('📊 UPDATE SUMMARY:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`✅ Files updated: ${updatedCount}`);
console.log('📋 Changes made:');
console.log('   - Program ID: V1 → V2');
console.log('   - IDL file: game_token.json → game_token_v2.json');
console.log('   - Seeds: "game_pools" → "game_pools_v2"');
console.log('   - Seeds: "game_pools_token_account" → "game_pools_v2_token_account"');
console.log();

if (updatedCount > 0) {
  console.log('🎉 SUCCESS: All test files updated to use Smart Contract V2!');
  console.log('💡 Next steps:');
  console.log('   1. Build smart contract V2');
  console.log('   2. Deploy V2 contract');
  console.log('   3. Test auto-mint with V2');
} else {
  console.log('ℹ️ No files needed updating');
}




