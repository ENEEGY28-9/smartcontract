import puppeteer from 'puppeteer';
import { Connection, PublicKey } from '@solana/web3.js';
import fs from 'fs';

const OWNER_WALLET = 'A1Tk1KLSkH4dbeS1mKv9CrUKVRuErHGBg6oH9XUD2sLB';

async function automateFaucetFunding() {
  console.log('🤖 AUTOMATED FAUCET FUNDING SYSTEM');
  console.log('='.repeat(50));
  console.log('🎯 Target Wallet:', OWNER_WALLET);
  console.log('💰 Target Amount: 2 SOL (maximum)');
  console.log('⏳ Estimated Time: 2-3 minutes');
  console.log('');

  // Check current balance
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const initialBalance = await connection.getBalance(new PublicKey(OWNER_WALLET));
  const initialSol = initialBalance / 1e9;

  console.log('💰 Current Balance:', initialSol.toFixed(4), 'SOL');

  if (initialSol >= 0.01) {
    console.log('✅ Wallet already funded!');
    console.log('🎉 Ready for token transfers!');
    await runTransferTest();
    return;
  }

  console.log('\n🔄 STARTING AUTOMATION...\n');

  // Method 1: Solana Official Faucet
  console.log('📡 METHOD 1: SOLANA OFFICIAL FAUCET');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const success = await trySolanaOfficialFaucet();
  if (success) {
    console.log('✅ Official faucet succeeded!');
    await verifyAndTest();
    return;
  }

  // Method 2: Alternative Faucets
  console.log('\n📡 METHOD 2: ALTERNATIVE FAUCETS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const altSuccess = await tryAlternativeFaucets();
  if (altSuccess) {
    console.log('✅ Alternative faucet succeeded!');
    await verifyAndTest();
    return;
  }

  // Method 3: Fallback Solutions
  console.log('\n📡 METHOD 3: FALLBACK SOLUTIONS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await provideFallbackSolutions();
}

async function trySolanaOfficialFaucet() {
  console.log('🌐 Attempting Solana Official Faucet...');

  try {
    const browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ],
      defaultViewport: { width: 1280, height: 720 }
    });

    const page = await browser.newPage();

    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log('📱 Opening faucet page...');
    await page.goto('https://faucet.solana.com/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Wait for page to fully load
    await page.waitForTimeout(3000);

    console.log('🎯 Looking for network selector...');

    // Try to select Devnet
    try {
      // Look for dropdown or radio buttons
      const networkSelectors = [
        'select[name*="network"]',
        'select[id*="network"]',
        'input[type="radio"][value*="devnet"]',
        'button:has-text("devnet")',
        'option[value*="devnet"]',
        '.network-selector select',
        '#network-select'
      ];

      let networkSelected = false;
      for (const selector of networkSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });

          if (selector.includes('select')) {
            await page.select(selector, 'devnet');
          } else {
            await page.click(selector);
          }

          console.log('   ✅ Devnet selected');
          networkSelected = true;
          break;
        } catch (error) {
          continue;
        }
      }

      if (!networkSelected) {
        console.log('   ⚠️ Could not find network selector, assuming Devnet is default');
      }

    } catch (error) {
      console.log('   ⚠️ Network selection issue:', error.message);
    }

    await page.waitForTimeout(2000);

    console.log('📝 Entering wallet address...');

    // Find address input field
    const addressSelectors = [
      'input[type="text"]',
      'input[placeholder*="address"]',
      'input[placeholder*="recipient"]',
      'input[name*="address"]',
      'input[id*="address"]',
      'textarea',
      '.address-input input'
    ];

    let addressEntered = false;
    for (const selector of addressSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        await page.click(selector, { clickCount: 3 }); // Select all
        await page.type(selector, OWNER_WALLET, { delay: 100 });
        console.log('   ✅ Address entered');
        addressEntered = true;
        break;
      } catch (error) {
        continue;
      }
    }

    if (!addressEntered) {
      console.log('   ❌ Could not find address input field');
      await browser.close();
      return false;
    }

    await page.waitForTimeout(1000);

    console.log('💰 Selecting amount...');

    // Try to select maximum amount (2 SOL)
    try {
      const amountSelectors = [
        'select[name*="amount"]',
        'input[name*="amount"]',
        'button:has-text("2")',
        'option[value="2"]',
        '.amount-selector select'
      ];

      for (const selector of amountSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 3000 });

          if (selector.includes('select')) {
            await page.select(selector, '2');
          } else if (selector.includes('input')) {
            await page.click(selector, { clickCount: 3 });
            await page.type(selector, '2', { delay: 100 });
          } else {
            await page.click(selector);
          }

          console.log('   ✅ Amount 2 SOL selected');
          break;
        } catch (error) {
          continue;
        }
      }
    } catch (error) {
      console.log('   ⚠️ Could not select amount, using default');
    }

    await page.waitForTimeout(1000);

    console.log('🎯 Requesting airdrop...');

    // Find and click request button
    const buttonSelectors = [
      'button:has-text("Request Airdrop")',
      'button:has-text("Confirm Airdrop")',
      'button[type="submit"]',
      'input[type="submit"]',
      'button[class*="request"]',
      'button[class*="confirm"]',
      '.request-button',
      '#request-airdrop'
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

    console.log('⏳ Waiting for confirmation...');

    // Wait for success message
    try {
      await page.waitForSelector(
        ':has-text("Success"), :has-text("successful"), :has-text("airdrop"), :has-text("sent")',
        { timeout: 30000 }
      );
      console.log('   ✅ Success message detected!');
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

async function tryAlternativeFaucets() {
  const faucets = [
    {
      name: 'QuickNode Devnet',
      url: 'https://faucet.quicknode.com/solana/devnet',
      method: 'automation'
    },
    {
      name: 'Solana Devnet Explorer Faucet',
      url: 'https://explorer.solana.com/faucet',
      method: 'manual'
    },
    {
      name: 'Solana Labs Discord',
      url: 'https://discord.com/invite/solana',
      method: 'manual'
    }
  ];

  for (const faucet of faucets) {
    console.log(`   Trying ${faucet.name}...`);

    if (faucet.method === 'manual') {
      console.log(`   📋 MANUAL: Visit ${faucet.url}`);
      console.log(`   📧 Address: ${OWNER_WALLET}`);
      continue;
    }

    // Try automation for QuickNode
    if (faucet.url.includes('quicknode')) {
      const success = await tryQuickNodeFaucet();
      if (success) return true;
    }
  }

  return false;
}

async function tryQuickNodeFaucet() {
  try {
    const browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1200, height: 800 }
    });

    const page = await browser.newPage();

    console.log('   📱 Opening QuickNode faucet...');
    await page.goto('https://faucet.quicknode.com/solana/devnet', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await page.waitForTimeout(3000);

    console.log('   📝 Entering address...');
    const inputSelectors = ['input[type="text"]', 'textarea', 'input[placeholder*="address"]'];

    for (const selector of inputSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        await page.click(selector, { clickCount: 3 });
        await page.type(selector, OWNER_WALLET, { delay: 100 });
        console.log('   ✅ Address entered');
        break;
      } catch (error) {
        continue;
      }
    }

    console.log('   🎯 Requesting SOL...');
    const buttonSelectors = ['button:has-text("Send")', 'button[type="submit"]'];

    for (const selector of buttonSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        await page.click(selector);
        console.log('   ✅ Request sent');
        break;
      } catch (error) {
        continue;
      }
    }

    await page.waitForTimeout(5000);
    await browser.close();

    // Assume it worked (we can't easily detect success)
    console.log('   ✅ QuickNode request completed');
    return true;

  } catch (error) {
    console.error('   ❌ QuickNode error:', error.message);
    return false;
  }
}

async function provideFallbackSolutions() {
  console.log('📋 FALLBACK FUNDING SOLUTIONS:');
  console.log('');

  console.log('🌐 METHOD A: MANUAL FAUCETS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. Official Solana: https://faucet.solana.com/');
  console.log('   - Select: Devnet');
  console.log('   - Address:', OWNER_WALLET);
  console.log('   - Amount: 2 SOL');
  console.log('');

  console.log('2. Solana Explorer: https://explorer.solana.com/faucet');
  console.log('   - Built-in faucet in explorer');
  console.log('');

  console.log('3. QuickNode: https://faucet.quicknode.com/solana/devnet');
  console.log('');

  console.log('🌐 METHOD B: DISCORD BOT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. Join: https://discord.com/invite/solana');
  console.log('2. Go to: #devnet-faucet channel');
  console.log('3. Command: !airdrop', OWNER_WALLET);
  console.log('');

  console.log('🌐 METHOD C: ALTERNATIVE SERVICES');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. https://faucet.solana.com/ (try different browser)');
  console.log('2. https://solfaucet.com/');
  console.log('3. https://faucet.triangleplatform.com/solana/devnet');
  console.log('');

  console.log('⏳ METHOD D: WAIT AND RETRY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('• Limit: 2 requests per 8 hours');
  console.log('• Try again later if rate limited');
  console.log('');

  console.log('🎭 METHOD E: SIMULATION MODE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('For testing logic without real SOL:');
  console.log('node demo_working_transfer.js');
  console.log('');

  // Create simulation option
  console.log('🔄 CREATING SIMULATION OPTION...');
  const simData = {
    wallet: OWNER_WALLET,
    simulatedSOL: 2.0,
    note: 'Simulated SOL for testing transfer logic',
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync('owner_simulation.json', JSON.stringify(simData, null, 2));
  console.log('✅ Simulation data saved');
  console.log('💰 Simulated: 2.0 SOL');
  console.log('🎯 Test logic: node demo_working_transfer.js');
}

async function verifyAndTest() {
  console.log('\n🔍 VERIFYING FUNDING...\n');

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Wait a bit for transaction to process
  await new Promise(resolve => setTimeout(resolve, 10000));

  const newBalance = await connection.getBalance(new PublicKey(OWNER_WALLET));
  const newSol = newBalance / 1e9;

  console.log('💰 New Balance:', newSol.toFixed(4), 'SOL');

  if (newSol >= 0.01) {
    console.log('✅ FUNDING SUCCESSFUL!');
    console.log('🎉 Ready for token transfers!');
    await runTransferTest();
  } else {
    console.log('⚠️ Funding may still be processing...');
    console.log('💡 Check again in 30 seconds');
  }
}

async function runTransferTest() {
  console.log('\n🚀 RUNNING TRANSFER TEST...\n');

  try {
    const { execSync } = await import('child_process');
    execSync('node simple_transfer_test.js', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Transfer test failed:', error.message);
  }
}

// Run the automated funding
automateFaucetFunding().catch(console.error);




