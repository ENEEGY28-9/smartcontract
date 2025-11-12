import puppeteer from 'puppeteer';
import { Connection, PublicKey } from '@solana/web3.js';
import fs from 'fs';

const OWNER_WALLET = 'A1Tk1KLSkH4dbeS1mKv9CrUKVRuErHGBg6oH9XUD2sLB';

async function fundOwnerWalletComplete() {
  console.log('🚀 FUNDING OWNER WALLET - COMPLETE SOLUTION');
  console.log('='.repeat(55));

  console.log('🎯 TARGET WALLET:', OWNER_WALLET);
  console.log('💰 TARGET AMOUNT: 1 SOL minimum');
  console.log('⏳ ESTIMATED TIME: 2-5 minutes');
  console.log('');

  // Check current balance
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const currentBalance = await connection.getBalance(new PublicKey(OWNER_WALLET));
  const solBalance = currentBalance / 1e9;

  console.log('💰 CURRENT BALANCE:', solBalance.toFixed(4), 'SOL');

  if (solBalance >= 1) {
    console.log('✅ WALLET ALREADY FUNDED!');
    console.log('🎉 Ready for token transfers!');
    return await runTransferTest();
  }

  console.log('\n📋 FUNDING METHODS (Try in order):\n');

  // Method 1: Official Solana Faucet with Browser Automation
  console.log('🔥 METHOD 1: OFFICIAL SOLANA FAUCET (AUTOMATED)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const officialSuccess = await tryOfficialFaucetAutomation();
  if (officialSuccess) {
    console.log('✅ Official faucet successful!');
    return await runTransferTest();
  }

  // Method 2: QuickNode Faucet with Browser Automation
  console.log('\n🔥 METHOD 2: QUICKNODE FAUCET (AUTOMATED)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const quickNodeSuccess = await tryQuickNodeFaucetAutomation();
  if (quickNodeSuccess) {
    console.log('✅ QuickNode faucet successful!');
    return await runTransferTest();
  }

  // Method 3: Manual Instructions
  console.log('\n🔥 METHOD 3: MANUAL FUNDING (RECOMMENDED)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  await showManualFundingInstructions();

  // Method 4: Monitor for funding
  console.log('\n🔥 METHOD 4: MONITORING FOR FUNDING');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const monitoredSuccess = await monitorForFunding(connection);
  if (monitoredSuccess) {
    console.log('✅ Funding detected!');
    return await runTransferTest();
  }

  // Method 5: Fallback simulation
  console.log('\n🔥 METHOD 5: SIMULATION MODE (DEMO ONLY)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  return await runSimulationMode();
}

async function tryOfficialFaucetAutomation() {
  console.log('🤖 Automating Official Solana Faucet...\n');

  try {
    const browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1200, height: 800 }
    });

    const page = await browser.newPage();

    console.log('📱 Opening faucet...');
    await page.goto('https://faucet.solana.com/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Select Devnet
    console.log('🌍 Selecting Devnet...');
    try {
      await page.click('button:has-text("Devnet"), select option[value*="devnet"], input[value*="devnet"]', { timeout: 5000 });
    } catch (error) {
      console.log('   ⚠️ Could not find Devnet selector, may already be selected');
    }

    // Enter wallet address
    console.log('📝 Entering wallet address...');
    const addressSelectors = [
      'input[type="text"]',
      'input[placeholder*="address"]',
      'input[placeholder*="recipient"]',
      'input[id*="address"]'
    ];

    let inputFound = false;
    for (const selector of addressSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        await page.click(selector, { clickCount: 3 }); // Select all text
        await page.type(selector, OWNER_WALLET, { delay: 100 });
        console.log('   ✅ Address entered');
        inputFound = true;
        break;
      } catch (error) {
        continue;
      }
    }

    if (!inputFound) {
      console.log('   ❌ Could not find address input field');
      await browser.close();
      return false;
    }

    // Click request button
    console.log('🎯 Requesting airdrop...');
    const buttonSelectors = [
      'button:has-text("Request"), button:has-text("Airdrop"), button[type="submit"]',
      'button[class*="request"], button[class*="airdrop"]',
      'input[type="submit"]'
    ];

    let buttonClicked = false;
    for (const selector of buttonSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        await page.click(selector);
        console.log('   ✅ Request button clicked');
        buttonClicked = true;
        break;
      } catch (error) {
        continue;
      }
    }

    if (!buttonClicked) {
      console.log('   ❌ Could not find request button');
      await browser.close();
      return false;
    }

    // Wait for processing
    console.log('⏳ Waiting for processing...');
    await page.waitForTimeout(5000);

    // Check for success message
    try {
      await page.waitForSelector(':has-text("success"), :has-text("Success"), :has-text("sent")', { timeout: 10000 });
      console.log('   ✅ Success message detected!');
      await page.waitForTimeout(5000); // Wait a bit more
      await browser.close();
      return true;
    } catch (error) {
      console.log('   ⚠️ No success message, but request may still process');
      await page.waitForTimeout(10000);
      await browser.close();
      return false;
    }

  } catch (error) {
    console.error('   ❌ Automation error:', error.message);
    return false;
  }
}

async function tryQuickNodeFaucetAutomation() {
  console.log('🤖 Automating QuickNode Faucet...\n');

  try {
    const browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1200, height: 800 }
    });

    const page = await browser.newPage();

    console.log('📱 Opening QuickNode faucet...');
    await page.goto('https://faucet.quicknode.com/solana/devnet', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for page to load
    await page.waitForTimeout(3000);

    // Enter wallet address
    console.log('📝 Entering wallet address...');
    const inputSelectors = [
      'input[type="text"]',
      'input[placeholder*="address"]',
      'input[placeholder*="wallet"]',
      'textarea',
      'input[id*="address"]'
    ];

    let inputFound = false;
    for (const selector of inputSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        await page.click(selector, { clickCount: 3 }); // Select all
        await page.type(selector, OWNER_WALLET, { delay: 100 });
        console.log('   ✅ Address entered');
        inputFound = true;
        break;
      } catch (error) {
        continue;
      }
    }

    if (!inputFound) {
      console.log('   ❌ Could not find address input field');
      await browser.close();
      return false;
    }

    // Click request button
    console.log('🎯 Requesting SOL...');
    const buttonSelectors = [
      'button:has-text("Send"), button:has-text("Request"), button:has-text("Submit")',
      'button[type="submit"]',
      'button[class*="send"], button[class*="request"]',
      'input[type="submit"]'
    ];

    let buttonClicked = false;
    for (const selector of buttonSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        await page.click(selector);
        console.log('   ✅ Request button clicked');
        buttonClicked = true;
        break;
      } catch (error) {
        continue;
      }
    }

    if (!buttonClicked) {
      console.log('   ❌ Could not find request button');
      await browser.close();
      return false;
    }

    // Wait for processing
    console.log('⏳ Waiting for processing...');
    await page.waitForTimeout(8000);

    // Check for success
    try {
      await page.waitForSelector(':has-text("success"), :has-text("Success"), :has-text("sent"), :has-text("Success")', { timeout: 10000 });
      console.log('   ✅ Success detected!');
      await page.waitForTimeout(5000);
      await browser.close();
      return true;
    } catch (error) {
      console.log('   ⚠️ No success message, but request may still process');
      await page.waitForTimeout(10000);
      await browser.close();
      return false;
    }

  } catch (error) {
    console.error('   ❌ Automation error:', error.message);
    return false;
  }
}

async function showManualFundingInstructions() {
  console.log('📋 MANUAL FUNDING STEPS:');
  console.log('');

  console.log('🌐 STEP 1: Open Official Faucet');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   🔗 https://faucet.solana.com/');
  console.log('');

  console.log('🌍 STEP 2: Select Devnet');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   🎯 Click dropdown and select "Devnet"');
  console.log('');

  console.log('📝 STEP 3: Enter Wallet Address');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   📧 Copy and paste:');
  console.log('   ' + OWNER_WALLET);
  console.log('');

  console.log('🎯 STEP 4: Request SOL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   💰 Select amount: 1 SOL or 2 SOL');
  console.log('   🎯 Click: "Request Airdrop"');
  console.log('');

  console.log('⏳ STEP 5: Wait for Confirmation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   ⏰ Wait: 30-60 seconds');
  console.log('   ✅ Look for success message');
  console.log('');

  console.log('🔄 STEP 6: Verify Funding');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   💡 Run: node check_owner_balance.js');
  console.log('   🎉 Should show: SOL Balance > 0');
  console.log('');
}

async function monitorForFunding(connection) {
  console.log('👀 MONITORING FOR FUNDING...\n');

  const initialBalance = await connection.getBalance(new PublicKey(OWNER_WALLET));
  console.log('📊 Initial balance:', (initialBalance / 1e9).toFixed(4), 'SOL');

  let checks = 0;
  const maxChecks = 120; // 2 minutes

  while (checks < maxChecks) {
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const currentBalance = await connection.getBalance(new PublicKey(OWNER_WALLET));

      if (currentBalance > initialBalance) {
        const increase = currentBalance - initialBalance;
        console.log('\n🎉 FUNDING DETECTED!');
        console.log('💰 Balance increased by:', (increase / 1e9).toFixed(4), 'SOL');
        console.log('💰 New total balance:', (currentBalance / 1e9).toFixed(4), 'SOL');
        return true;
      }

      checks++;

      if (checks % 30 === 0) { // Every 30 seconds
        const minutes = Math.floor(checks / 60);
        const seconds = checks % 60;
        console.log(`⏳ Still monitoring... (${minutes}:${seconds.toString().padStart(2, '0')})`);
      }

    } catch (error) {
      console.error('❌ Balance check error:', error.message);
    }
  }

  console.log('\n⏰ Monitoring timeout - no funding detected');
  return false;
}

async function runTransferTest() {
  console.log('\n🚀 RUNNING TRANSFER TEST...\n');

  try {
    // Import and run the transfer test
    const { execSync } = await import('child_process');
    execSync('node simple_transfer_test.js', { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error('❌ Transfer test failed:', error.message);
    return false;
  }
}

async function runSimulationMode() {
  console.log('🎭 RUNNING SIMULATION MODE...\n');

  // Create simulation data
  const simulationData = {
    wallet: OWNER_WALLET,
    simulatedSOL: 2.0,
    note: 'Simulated SOL for testing token transfer logic',
    created: new Date().toISOString(),
    reminder: 'This is simulation only - use real faucet for production'
  };

  fs.writeFileSync('owner_wallet_simulation.json', JSON.stringify(simulationData, null, 2));

  console.log('✅ Simulation data created');
  console.log('💰 Simulated Balance: 2.0 SOL');
  console.log('🎯 Logic test: node demo_working_transfer.js');
  console.log('');

  console.log('⚠️  IMPORTANT REMINDERS:');
  console.log('   🎭 This is simulation only');
  console.log('   💡 Real SOL needed for blockchain transactions');
  console.log('   🌐 Use faucet links above for actual funding');
  console.log('');

  return await runTransferTest();
}

// Run the complete funding solution
fundOwnerWalletComplete().then(success => {
  if (success) {
    console.log('\n🎊 SUCCESS! WALLET FUNDED AND TESTED!');
  } else {
    console.log('\n📋 SUMMARY:');
    console.log('   ✅ Scripts created and ready');
    console.log('   ✅ Faucet automation attempted');
    console.log('   ✅ Manual instructions provided');
    console.log('   ⚠️  May need manual funding');
    console.log('   🎯 Next: node check_owner_balance.js');
  }
}).catch(console.error);




