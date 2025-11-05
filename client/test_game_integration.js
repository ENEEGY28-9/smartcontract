// Test script to check game integration and debug issues
import { chromium } from 'playwright';

async function testGameIntegration() {
    console.log('🧪 Testing Game Integration with Token System...');

    const browser = await chromium.launch({
        headless: false,
        args: ['--window-size=1200,800']
    });

    const page = await browser.newPage();
    await page.setViewportSize({ width: 1200, height: 800 });

    try {
        // Listen for console messages
        page.on('console', msg => {
            console.log('PAGE LOG:', msg.text());
        });

        page.on('pageerror', error => {
            console.error('PAGE ERROR:', error.message);
        });

        // Navigate to game
        console.log('📱 Loading game at http://localhost:5173...');
        await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

        console.log('✅ Game loaded successfully');

        // Wait for page to stabilize
        await page.waitForTimeout(2000);

        // Check if main elements exist
        const title = await page.title();
        console.log('📄 Page title:', title);

        // Check for game canvas
        const canvasExists = await page.locator('canvas, #gameCanvas, .game-canvas').count() > 0;
        console.log('🎮 Game canvas found:', canvasExists);

        // Check for Svelte components
        const hasSvelte = await page.evaluate(() => {
            return typeof window.$$ !== 'undefined' || document.querySelector('[data-svelte]');
        });
        console.log('🔧 Svelte loaded:', hasSvelte);

        // Check for token service initialization
        const tokenServiceInit = await page.evaluate(() => {
            return new Promise((resolve) => {
                let attempts = 0;
                const check = () => {
                    attempts++;
                    if (window.TokenService) {
                        resolve(true);
                    } else if (attempts < 50) { // 5 seconds max
                        setTimeout(check, 100);
                    } else {
                        resolve(false);
                    }
                };
                check();
            });
        });
        console.log('🎯 TokenService initialized:', tokenServiceInit);

        // Check for blockchain integration
        const blockchainInit = await page.evaluate(() => {
            return new Promise((resolve) => {
                let attempts = 0;
                const check = () => {
                    attempts++;
                    if (window.BlockchainIntegration) {
                        resolve(true);
                    } else if (attempts < 30) { // 3 seconds max
                        setTimeout(check, 100);
                    } else {
                        resolve(false);
                    }
                };
                check();
            });
        });
        console.log('🌐 Blockchain integration loaded:', blockchainInit);

        // Try to find and click start game button
        try {
            const startButtons = [
                'button:has-text("Start")',
                'button:has-text("Start Game")',
                '#startGameBtn',
                'button[class*="start"]'
            ];

            let startButtonFound = false;
            for (const selector of startButtons) {
                try {
                    const button = await page.locator(selector).first();
                    if (await button.count() > 0) {
                        console.log('🎯 Found start button:', selector);
                        await button.click();
                        startButtonFound = true;
                        break;
                    }
                } catch (e) {
                    // Continue to next selector
                }
            }

            if (!startButtonFound) {
                console.log('⚠️ No start button found - game may auto-start');
            }
        } catch (error) {
            console.log('⚠️ Could not find start button:', error.message);
        }

        // Wait for game to initialize
        await page.waitForTimeout(3000);

        // Check for particles
        const particleCount = await page.locator('.particle').count();
        console.log('⚡ Particles found:', particleCount);

        // Check for player
        const playerFound = await page.locator('.player, #player').count() > 0;
        console.log('🏃 Player found:', playerFound);

        // Check for token balance display
        const tokenBalance = await page.locator('#tokenBalance, [data-testid="token-balance"]').count() > 0;
        console.log('🪙 Token balance display found:', tokenBalance);

        // Check for wallet connection
        const walletButton = await page.locator('#connectWalletBtn, button:has-text("Connect")').count() > 0;
        console.log('🔗 Wallet connect button found:', walletButton);

        // Test keyboard input
        console.log('🎹 Testing keyboard input...');
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('Space'); // May trigger actions

        await page.waitForTimeout(1000);

        // Check for any error messages in DOM
        const errorElements = await page.locator('.error, [class*="error"]').allTextContents();
        if (errorElements.length > 0) {
            console.log('❌ Errors found in DOM:', errorElements);
        } else {
            console.log('✅ No errors found in DOM');
        }

        // Check network requests for failed loads
        const failedRequests = [];
        page.on('response', response => {
            if (!response.ok() && response.url().includes('.js')) {
                failedRequests.push(`${response.url()} - ${response.status()}`);
            }
        });

        await page.waitForTimeout(2000);

        if (failedRequests.length > 0) {
            console.log('❌ Failed JavaScript loads:', failedRequests);
        } else {
            console.log('✅ All JavaScript files loaded successfully');
        }

        // Final status report
        console.log('\n📊 INTEGRATION TEST RESULTS:');
        console.log('=====================================');
        console.log(`✅ Game loaded: ${title ? 'YES' : 'NO'}`);
        console.log(`✅ Svelte framework: ${hasSvelte ? 'YES' : 'NO'}`);
        console.log(`✅ TokenService: ${tokenServiceInit ? 'YES' : 'NO'}`);
        console.log(`✅ Blockchain integration: ${blockchainInit ? 'YES' : 'NO'}`);
        console.log(`✅ Game canvas: ${canvasExists ? 'YES' : 'NO'}`);
        console.log(`✅ Particles system: ${particleCount > 0 ? 'YES' : 'NO'}`);
        console.log(`✅ Player character: ${playerFound ? 'YES' : 'NO'}`);
        console.log(`✅ Token balance UI: ${tokenBalance ? 'YES' : 'NO'}`);
        console.log(`✅ Wallet connection: ${walletButton ? 'YES' : 'NO'}`);
        console.log(`✅ JavaScript errors: ${failedRequests.length === 0 ? 'NONE' : failedRequests.length}`);
        console.log('=====================================');

        const successCount = [
            title,
            hasSvelte,
            tokenServiceInit,
            blockchainInit,
            canvasExists,
            particleCount > 0,
            playerFound,
            tokenBalance,
            walletButton,
            failedRequests.length === 0
        ].filter(Boolean).length;

        const totalChecks = 10;
        const successRate = (successCount / totalChecks * 100).toFixed(1);

        console.log(`🎯 OVERALL SUCCESS: ${successCount}/${totalChecks} (${successRate}%)`);

        if (successRate >= 80) {
            console.log('🎉 INTEGRATION SUCCESSFUL!');
        } else {
            console.log('⚠️ INTEGRATION ISSUES DETECTED - CHECK LOGS ABOVE');
        }

        // Keep browser open for manual inspection
        console.log('\n🌐 Browser remains open for manual testing...');
        console.log('🎮 Try playing the game manually!');
        console.log('🔗 Press Ctrl+C to close browser');

        // Wait indefinitely for manual testing
        await new Promise(() => {});

    } catch (error) {
        console.error('❌ Test failed:', error);

        // Take screenshot for debugging
        try {
            await page.screenshot({ path: 'game_error_screenshot.png', fullPage: true });
            console.log('📸 Error screenshot saved as game_error_screenshot.png');
        } catch (screenshotError) {
            console.error('Could not save screenshot:', screenshotError);
        }
    } finally {
        // Browser will be closed when process exits
        process.on('SIGINT', async () => {
            console.log('\n👋 Closing browser...');
            await browser.close();
            process.exit(0);
        });
    }
}

// Handle missing playwright gracefully
try {
    testGameIntegration().catch(console.error);
} catch (error) {
    console.log('⚠️ Playwright not available, running basic checks...');

    // Basic checks without browser automation
    console.log('🔍 Checking file structure...');

    import fs from 'fs';
    import path from 'path';
    import { fileURLToPath } from 'url';

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const checkFile = (filePath) => {
        try {
            const exists = fs.existsSync(path.join(__dirname, filePath));
            console.log(`${exists ? '✅' : '❌'} ${filePath}`);
            return exists;
        } catch (error) {
            console.log(`❌ ${filePath} - Error: ${error.message}`);
            return false;
        }
    };

    const filesToCheck = [
        'src/lib/services/tokenService.ts',
        'src/routes/+page.svelte',
        'public/game_token/blockchain_integration.js',
        'public/game_token/mainnet_deployment_info.json',
        'package.json'
    ];

    let fileCheckCount = 0;
    filesToCheck.forEach(file => {
        if (checkFile(file)) fileCheckCount++;
    });

    console.log(`\n📁 File check: ${fileCheckCount}/${filesToCheck.length} files present`);

    if (fileCheckCount === filesToCheck.length) {
        console.log('✅ All integration files are present');
        console.log('💡 Try running: npm run dev');
        console.log('🌐 Then open: http://localhost:5173');
    } else {
        console.log('❌ Some integration files are missing');
        console.log('🔧 Please ensure all token integration files are properly installed');
    }
}
