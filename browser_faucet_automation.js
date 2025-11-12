import puppeteer from 'puppeteer';
import { Connection, PublicKey } from '@solana/web3.js';

const USER_WALLET = '4UkWvx2Y59XSuhaCfeYDS56RM1WcsSdgjJ7yzLEbMyNf';

async function checkBalance() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const balance = await connection.getBalance(new PublicKey(USER_WALLET));
  return balance / 1e9;
}

async function requestFromQuickNodeFaucet() {
  console.log('🌐 AUTOMATING QuickNode FAUCET REQUEST...\n');

  const browser = await puppeteer.launch({
    headless: false, // Show browser for transparency
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    console.log('📱 Opening QuickNode faucet...');
    await page.goto('https://faucet.quicknode.com/solana/devnet', {
      waitUntil: 'networkidle2'
    });

    console.log('📝 Filling wallet address...');
    const inputSelector = 'input[type="text"], input[placeholder*="address"], input[placeholder*="wallet"]';

    await page.waitForSelector(inputSelector, { timeout: 10000 });
    await page.type(inputSelector, USER_WALLET, { delay: 100 });

    console.log('🎯 Clicking request button...');
    const buttonSelectors = [
      'button:has-text("Send"), button:has-text("Request"), button:has-text("Airdrop")',
      'button[type="submit"]',
      '.btn, .button'
    ];

    for (const selector of buttonSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        await page.click(selector);
        console.log('✅ Button clicked!');
        break;
      } catch (error) {
        continue;
      }
    }

    console.log('⏳ Waiting for confirmation...');
    await page.waitForTimeout(5000);

    // Check for success message
    const successSelectors = [
      ':has-text("success"), :has-text("Success"), :has-text("sent")',
      '.success, .alert-success'
    ];

    let successFound = false;
    for (const selector of successSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        successFound = true;
        console.log('🎉 SUCCESS MESSAGE DETECTED!');
        break;
      } catch (error) {
        continue;
      }
    }

    if (!successFound) {
      console.log('⚠️ No success message detected, but request may still process');
    }

    console.log('🔗 Keep browser open for 30 seconds to monitor...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ Automation error:', error.message);
  } finally {
    await browser.close();
  }
}

async function requestFromOfficialFaucet() {
  console.log('🌐 AUTOMATING OFFICIAL SOLANA FAUCET...\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    console.log('📱 Opening official faucet...');
    await page.goto('https://faucet.solana.com/', {
      waitUntil: 'networkidle2'
    });

    // Select Devnet
    console.log('🎯 Selecting Devnet network...');
    const devnetSelector = 'button:has-text("Devnet"), select option[value*="devnet"], input[value*="devnet"]';
    try {
      await page.waitForSelector(devnetSelector, { timeout: 5000 });
      await page.click(devnetSelector);
    } catch (error) {
      console.log('⚠️ Could not find Devnet selector, may already be selected');
    }

    // Enter wallet address
    console.log('📝 Entering wallet address...');
    const addressInput = 'input[type="text"], input[placeholder*="address"], input[placeholder*="recipient"]';
    await page.waitForSelector(addressInput, { timeout: 10000 });
    await page.type(addressInput, USER_WALLET, { delay: 100 });

    // Click request button
    console.log('🎯 Requesting airdrop...');
    const requestButton = 'button:has-text("Request"), button:has-text("Airdrop"), button[type="submit"]';
    await page.waitForSelector(requestButton, { timeout: 5000 });
    await page.click(requestButton);

    console.log('⏳ Waiting for processing...');
    await page.waitForTimeout(10000);

    console.log('🔗 Keep browser open to monitor result...');
    await page.waitForTimeout(20000);

  } catch (error) {
    console.error('❌ Automation error:', error.message);
  } finally {
    await browser.close();
  }
}

async function monitorBalanceForChanges() {
  console.log('👀 MONITORING BALANCE CHANGES...\n');

  const initialBalance = await checkCurrentBalance();
  console.log(`📊 Initial: ${initialBalance} SOL`);

  let lastBalance = initialBalance;
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Check every 5 seconds

    try {
      const currentBalance = await checkCurrentBalance();

      if (currentBalance !== lastBalance) {
        const change = currentBalance - lastBalance;
        console.log(`💰 BALANCE CHANGED: ${lastBalance} → ${currentBalance} SOL (${change > 0 ? '+' : ''}${change})`);

        if (currentBalance >= 1) {
          console.log('\n🎉 WALLET READY FOR TESTING!');
          console.log('🚀 Run: node check_wallet_ready.js');
          return true;
        }

        lastBalance = currentBalance;
      }

      attempts++;

      if (attempts % 12 === 0) { // Every minute
        console.log(`⏳ Still monitoring... (${attempts * 5}s elapsed)`);
      }

    } catch (error) {
      console.error('❌ Balance check error:', error.message);
    }
  }

  console.log('\n⏰ Monitoring timeout reached');
  return false;
}

async function checkCurrentBalance() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const balance = await connection.getBalance(new PublicKey(USER_WALLET));
  return balance / 1e9;
}

async function main() {
  console.log('🤖 BROWSER AUTOMATION FAUCET REQUEST\n');
  console.log('Target Wallet:', USER_WALLET);
  console.log('='.repeat(50) + '\n');

  // Check initial balance
  const initialBalance = await checkCurrentBalance();
  console.log(`💰 Initial Balance: ${initialBalance} SOL\n`);

  if (initialBalance >= 1) {
    console.log('✅ Wallet already has sufficient SOL!');
    console.log('🚀 Proceed to: node check_wallet_ready.js');
    return;
  }

  console.log('🔄 CHOOSE FAUCET METHOD:\n');
  console.log('1. QuickNode Faucet (Automated)');
  console.log('2. Official Solana Faucet (Automated)');
  console.log('3. Manual Instructions\n');

  // Default to QuickNode automation
  console.log('🚀 STARTING AUTOMATED FAUCET REQUEST...\n');

  try {
    await requestFromQuickNodeFaucet();
  } catch (error) {
    console.log('❌ QuickNode failed, trying official faucet...');
    try {
      await requestFromOfficialFaucet();
    } catch (error2) {
      console.log('❌ Both automated methods failed');
      console.log('📋 Please use manual method from previous output');
    }
  }

  console.log('\n👀 STARTING BALANCE MONITORING...\n');
  const funded = await monitorBalanceForChanges();

  if (funded) {
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. node check_wallet_ready.js');
    console.log('2. node full_interaction_test.js');
  } else {
    console.log('\n⏰ FUNDING MAY TAKE TIME - CHECK LATER');
    console.log('💡 Run: node check_wallet_ready.js');
  }
}

main().catch(console.error);






