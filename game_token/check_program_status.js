const { Connection, PublicKey } = require('@solana/web3.js');

async function checkProgramStatus() {
  console.log('🔍 CHECKING SMART CONTRACT STATUS ON DEVNET');
  console.log('='.repeat(60));

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const programId = new PublicKey('Do9Bq3c7rSSU4YW32F3mCZekQZo5jdyaBuayqmNGAeTf');

  console.log('📄 Program ID:', programId.toString());

  try {
    const accountInfo = await connection.getAccountInfo(programId);

    if (accountInfo) {
      console.log('✅ PROGRAM EXISTS ON DEVNET!');
      console.log('📊 Account Details:');
      console.log('   - Size:', accountInfo.data.length, 'bytes');
      console.log('   - Owner:', accountInfo.owner.toString());
      console.log('   - Executable:', accountInfo.executable);
      console.log('   - Lamports:', accountInfo.lamports);

      if (accountInfo.executable) {
        console.log('🎉 STATUS: REAL SMART CONTRACT - Deployed and executable');
        console.log('💡 This program can execute on-chain instructions');
      } else {
        console.log('⚠️ STATUS: Program account exists but NOT executable');
        console.log('💡 This is just a data account, not a smart contract');
      }
    } else {
      console.log('❌ PROGRAM DOES NOT EXIST ON DEVNET');
      console.log('🎯 STATUS: SIMULATION MODE - No real deployment');

      console.log('\n📋 What this means:');
      console.log('   - No smart contract deployed to Solana devnet');
      console.log('   - All operations are JavaScript simulations');
      console.log('   - Token transfers use minting, not real contract logic');
      console.log('   - Game pool balance never decreases');
    }

    // Check automint test results
    console.log('\n🔄 CHECKING AUTOMINT TEST RESULTS...');

    const fs = require('fs');
    try {
      const autoMintResult = JSON.parse(fs.readFileSync('auto_mint_test_result.json', 'utf8'));
      console.log('📊 Auto-mint Test Results:');
      console.log('   - Status:', autoMintResult.success ? '✅ PASSED' : '❌ FAILED');
      console.log('   - Tokens minted:', autoMintResult.tokens_minted || 'N/A');
      console.log('   - Distribution:', autoMintResult.distribution || 'N/A');

      if (autoMintResult.success) {
        console.log('✅ Auto-mint logic working (but via simulation)');
      }
    } catch (error) {
      console.log('❌ No auto-mint test results found');
    }

    // Overall conclusion
    console.log('\n🎯 FINAL CONCLUSION:');
    console.log('='.repeat(40));

    if (accountInfo && accountInfo.executable) {
      console.log('🟢 REAL SMART CONTRACT DEPLOYMENT');
      console.log('   - Program exists and is executable on devnet');
      console.log('   - Auto-mint and player claims use real on-chain logic');
      console.log('   - Game pool balance changes with transactions');
    } else {
      console.log('🟡 SIMULATION MODE ONLY');
      console.log('   - No real smart contract on devnet');
      console.log('   - All operations simulated via JavaScript');
      console.log('   - Token transfers via minting (not contract logic)');
      console.log('   - Game pool balance never decreases');
      console.log('   - Need Rust + Anchor + Solana CLI for real deployment');
    }

  } catch (error) {
    console.log('❌ Error checking program:', error.message);
    console.log('🎯 STATUS: SIMULATION MODE (Cannot verify on-chain status)');
  }
}

checkProgramStatus();


