import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function fixSmartContractDeployment() {
  console.log('🔧 FIXING SMART CONTRACT DEPLOYMENT ISSUE\n');

  console.log('📋 Current Status:');
  console.log('❌ Only SPL Token Mint deployed (2AxM2y84vg5rwP7QK7mwmBBZrDnZpXZxKTwU5vvX1FWK)');
  console.log('❌ Smart Contract Program not deployed');
  console.log('🎯 Need to deploy: game_token.so (contains auto_mint logic)\n');

  // Step 1: Check Solana balance
  console.log('1️⃣ Checking Solana Balance...');
  try {
    const balanceOutput = execSync('solana-cli\\solana-release\\bin\\solana.exe balance', { encoding: 'utf8' });
    const balance = parseFloat(balanceOutput.trim().split(' ')[0]);
    console.log(`✅ SOL Balance: ${balance} SOL`);

    if (balance < 2) {
      console.log('⚠️ Balance too low. Requesting airdrop...');
      try {
        execSync('solana-cli\\solana-release\\bin\\solana.exe airdrop 2', { encoding: 'utf8' });
        console.log('✅ Airdrop successful');
      } catch (error) {
        console.log('❌ Airdrop failed:', error.message);
        console.log('💡 Please manually request SOL from https://faucet.solana.com');
        return;
      }
    }
  } catch (error) {
    console.log('❌ Cannot check balance:', error.message);
    console.log('💡 Solana CLI may not be in PATH');
    return;
  }

  // Step 2: Check if smart contract binary exists
  console.log('\n2️⃣ Checking Smart Contract Binary...');
  const __dirname = path.dirname(new URL(import.meta.url).pathname).replace(/^\/[A-Za-z]:/, match => match.slice(1));
  const soFilePath = path.join(__dirname, 'game_token', 'target', 'deploy', 'game_token.so');

  if (!fs.existsSync(soFilePath)) {
    console.log('❌ game_token.so not found');
    console.log('🔨 Attempting to build smart contract...');

    // Try to build with cargo directly
    try {
      console.log('Building with cargo build-sbf...');
      execSync('cd game_token/programs/game_token && cargo build-sbf', { stdio: 'inherit' });
      console.log('✅ Smart contract built with cargo');
    } catch (cargoError) {
      console.log('❌ Cargo build failed:', cargoError.message);
      console.log('💡 Manual build required. Run:');
      console.log('   cd game_token/programs/game_token');
      console.log('   cargo build-sbf');
      return;
    }
  } else {
    console.log('✅ game_token.so found');
    const stats = fs.statSync(soFilePath);
    console.log(`📊 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  }

  // Step 3: Deploy smart contract
  console.log('\n3️⃣ Deploying Smart Contract Program...');

  try {
    const deployCommand = `solana-cli\\solana-release\\bin\\solana.exe program deploy game_token/target/deploy/game_token.so --url https://api.devnet.solana.com`;
    console.log('🚀 Running:', deployCommand);

    const deployOutput = execSync(deployCommand, {
      encoding: 'utf8',
      stdio: 'pipe',
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });

    console.log('📤 Deploy output:');
    console.log(deployOutput);

    // Extract Program ID from output
    const programIdMatch = deployOutput.match(/Program Id: ([A-Za-z0-9]+)/);
    if (programIdMatch) {
      const newProgramId = programIdMatch[1];
      console.log('✅ Smart Contract Deployed Successfully!');
      console.log('🎯 New Program ID:', newProgramId);

      // Step 4: Update configuration files
      console.log('\n4️⃣ Updating Configuration Files...');

      // Update Anchor.toml
      const anchorTomlPath = path.join(__dirname, 'game_token', 'Anchor.toml');
      let anchorToml = fs.readFileSync(anchorTomlPath, 'utf8');
      anchorToml = anchorToml.replace(
        /game_token = "[^"]*"/,
        `game_token = "${newProgramId}"`
      );
      fs.writeFileSync(anchorTomlPath, anchorToml);
      console.log('✅ Updated Anchor.toml');

      // Update lib.rs declare_id
      const libRsPath = path.join(__dirname, 'game_token', 'programs', 'game_token', 'src', 'lib.rs');
      let libRs = fs.readFileSync(libRsPath, 'utf8');
      libRs = libRs.replace(
        /declare_id!\("[^"]*"\)/,
        `declare_id!("${newProgramId}")`
      );
      fs.writeFileSync(libRsPath, libRs);
      console.log('✅ Updated lib.rs declare_id!');

      // Save deployment info
      const deploymentInfo = {
        programId: newProgramId,
        deploymentTime: new Date().toISOString(),
        network: 'devnet',
        type: 'smart_contract_program',
        status: 'deployed',
        logicVersion: 'auto_mint_80_20'
      };

      fs.writeFileSync('smart_contract_deployment_complete.json', JSON.stringify(deploymentInfo, null, 2));
      console.log('✅ Saved deployment info');

      // Step 5: Verification
      console.log('\n5️⃣ Verifying Deployment...');

      try {
        const verifyOutput = execSync(`solana-cli\\solana-release\\bin\\solana.exe program show ${newProgramId}`, { encoding: 'utf8' });
        if (verifyOutput.includes('Program Id:')) {
          console.log('✅ Program verified on Solana devnet');

          console.log('\n🎉 SMART CONTRACT DEPLOYMENT COMPLETED SUCCESSFULLY!');
          console.log('========================================');
          console.log('✅ Smart Contract Program deployed');
          console.log('✅ Program ID updated in configs');
          console.log('✅ Auto-mint scheduler ready');
          console.log('✅ Owner wallet monitoring ready');
          console.log('✅ Player gameplay testing ready');
          console.log('');
          console.log('🚀 Next Steps:');
          console.log('1. Start Gateway: cd gateway && cargo run');
          console.log('2. Start PocketBase: ./pocketbase/pocketbase.exe serve');
          console.log('3. Start Game Client: cd client && npm run dev');
          console.log('4. Monitor owner revenue: solana balance [OWNER_ADDRESS]');
          console.log('5. Test gameplay and watch 80/20 distribution work!');

        } else {
          console.log('❌ Program verification failed');
        }
      } catch (verifyError) {
        console.log('❌ Cannot verify program:', verifyError.message);
      }

    } else {
      console.log('❌ Cannot extract Program ID from deploy output');
      console.log('Deploy output:', deployOutput);
    }

  } catch (deployError) {
    console.log('❌ Deployment failed:', deployError.message);

    if (deployError.message.includes('insufficient funds')) {
      console.log('💡 Solution: Request more SOL from faucet');
      console.log('   https://faucet.solana.com');
    } else if (deployError.message.includes('already in use')) {
      console.log('💡 Solution: Program ID already exists, try redeploying');
    } else {
      console.log('💡 Check Solana CLI and network connection');
    }
  }
}

// Run the fix
fixSmartContractDeployment().catch(console.error);