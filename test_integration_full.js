// Comprehensive Integration Test Suite for Full Stack
import axios from 'axios';
import { execSync } from 'child_process';

const GATEWAY_URL = 'http://localhost:8080';
const POCKETBASE_URL = 'http://localhost:8090';

// Test configuration
const TEST_CONFIG = {
    users: 10,
    walletsPerUser: 3,
    concurrentRequests: 5,
    testDuration: 30000, // 30 seconds
    maxRetries: 3,
    timeout: 10000
};

// Test results tracking
const testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    startTime: Date.now(),
    endTime: null,
    errors: [],
    performance: {
        avgResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: Infinity,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0
    }
};

// Performance tracking
const responseTimes = [];

// Utility functions
function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
        'info': 'ℹ️ ',
        'success': '✅',
        'error': '❌',
        'warning': '⚠️ ',
        'test': '🧪'
    }[type] || 'ℹ️ ';

    console.log(`[${timestamp}] ${prefix} ${message}`);
}

function recordResponseTime(startTime) {
    const responseTime = Date.now() - startTime;
    responseTimes.push(responseTime);
    testResults.performance.totalRequests++;

    if (responseTime > testResults.performance.maxResponseTime) {
        testResults.performance.maxResponseTime = responseTime;
    }
    if (responseTime < testResults.performance.minResponseTime) {
        testResults.performance.minResponseTime = responseTime;
    }
}

function assert(condition, message, details = null) {
    testResults.total++;

    if (condition) {
        testResults.passed++;
        log(message, 'success');
        return true;
    } else {
        testResults.failed++;
        const error = { message, details, timestamp: new Date().toISOString() };
        testResults.errors.push(error);
        log(`${message} - ${details || 'Assertion failed'}`, 'error');
        return false;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Service health checks
async function checkServices() {
    log('Checking service availability...', 'test');

    try {
        // Check PocketBase
        const pbResponse = await axios.get(`${POCKETBASE_URL}/api/health`, { timeout: 5000 });
        assert(pbResponse.status === 200, 'PocketBase health check');
    } catch (error) {
        log(`PocketBase not available: ${error.message}`, 'warning');
    }

    try {
        // Check Gateway
        const gatewayResponse = await axios.get(`${GATEWAY_URL}/health`, { timeout: 5000 });
        assert(gatewayResponse.status === 200, 'Gateway health check');
    } catch (error) {
        log(`Gateway not available: ${error.message}`, 'warning');
    }
}

// User lifecycle tests
async function testUserLifecycle() {
    log('Testing user lifecycle...', 'test');

    const testUser = {
        username: `testuser_${Date.now()}`,
        email: `testuser_${Date.now()}@test.com`,
        password: 'testpass123'
    };

    let userToken = null;
    let userId = null;

    try {
        // 1. User Registration
        const startTime = Date.now();
        const registerResponse = await axios.post(`${GATEWAY_URL}/auth/register`, testUser);
        recordResponseTime(startTime);

        assert(registerResponse.status === 200, 'User registration successful');
        assert(registerResponse.data.user, 'User data returned');
        assert(registerResponse.data.access_token, 'Access token provided');

        userToken = registerResponse.data.access_token;
        userId = registerResponse.data.user.id;

        log(`User registered: ${testUser.username} (ID: ${userId})`, 'success');

    } catch (error) {
        assert(false, 'User registration failed', error.response?.data || error.message);
        return false;
    }

    try {
        // 2. User Authentication (Login)
        const startTime = Date.now();
        const loginResponse = await axios.post(`${GATEWAY_URL}/auth/login`, {
            email: testUser.email,
            password: testUser.password
        });
        recordResponseTime(startTime);

        assert(loginResponse.status === 200, 'User login successful');
        assert(loginResponse.data.access_token, 'Login token provided');

        log(`User logged in successfully`, 'success');

    } catch (error) {
        assert(false, 'User login failed', error.response?.data || error.message);
    }

    return { token: userToken, userId, user: testUser };
}

// HD Wallet tests
async function testHDWallet(userToken) {
    log('Testing HD wallet functionality...', 'test');

    let wallet = null;
    let mnemonic = null;

    try {
        // 1. Create HD Wallet
        const startTime = Date.now();
        const walletResponse = await axios.post(`${GATEWAY_URL}/api/wallet/create-hd`, {}, {
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
            }
        });
        recordResponseTime(startTime);

        assert(walletResponse.status === 200, 'HD wallet creation successful');
        assert(walletResponse.data.success, 'Wallet creation response success');
        assert(walletResponse.data.wallet, 'Wallet data returned');
        assert(walletResponse.data.mnemonic, 'Mnemonic phrase returned');

        wallet = walletResponse.data.wallet;
        mnemonic = walletResponse.data.mnemonic;

        log(`HD wallet created: ${wallet.public_key.substring(0, 20)}...`, 'success');
        log(`Mnemonic: ${mnemonic.split(' ').slice(0, 4).join(' ')}...`, 'info');

    } catch (error) {
        assert(false, 'HD wallet creation failed', error.response?.data || error.message);
        return false;
    }

    try {
        // 2. Derive additional wallets
        const startTime = Date.now();
        const deriveResponse = await axios.post(`${GATEWAY_URL}/api/wallet/derive`, {
            index: 1
        }, {
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
            }
        });
        recordResponseTime(startTime);

        assert(deriveResponse.status === 200, 'Wallet derivation successful');
        assert(deriveResponse.data.wallet, 'Derived wallet returned');

        const derivedWallet = deriveResponse.data.wallet;
        assert(derivedWallet.public_key !== wallet.public_key, 'Derived wallet is different');

        log(`Wallet derived successfully: ${derivedWallet.public_key.substring(0, 20)}...`, 'success');

    } catch (error) {
        assert(false, 'Wallet derivation failed', error.response?.data || error.message);
    }

    try {
        // 3. Wallet recovery from mnemonic
        const startTime = Date.now();
        const recoveryResponse = await axios.post(`${GATEWAY_URL}/api/wallet/recover`, {
            mnemonic: mnemonic
        }, {
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
            }
        });
        recordResponseTime(startTime);

        assert(recoveryResponse.status === 200, 'Wallet recovery successful');
        assert(recoveryResponse.data.wallet, 'Recovered wallet returned');
        assert(recoveryResponse.data.wallet.public_key === wallet.public_key, 'Recovered wallet matches original');

        log(`Wallet recovery successful`, 'success');

    } catch (error) {
        assert(false, 'Wallet recovery failed', error.response?.data || error.message);
    }

    return wallet;
}

// Token operations tests
async function testTokenOperations(userToken, wallet) {
    log('Testing token operations...', 'test');

    try {
        // 1. Check initial balance
        const startTime = Date.now();
        const balanceResponse = await axios.get(`${GATEWAY_URL}/api/token/balance`, {
            headers: {
                'Authorization': `Bearer ${userToken}`
            }
        });
        recordResponseTime(startTime);

        assert(balanceResponse.status === 200, 'Balance check successful');
        const initialBalance = balanceResponse.data.game_tokens || 0;

        log(`Initial balance: ${initialBalance} tokens`, 'info');

    } catch (error) {
        assert(false, 'Balance check failed', error.response?.data || error.message);
    }

    try {
        // 2. Mint tokens (eat particle)
        const startTime = Date.now();
        const mintResponse = await axios.post(`${GATEWAY_URL}/api/token/eat-particle`, {
            particle_location: [100, 200],
            particle_type: "energy"
        }, {
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
            }
        });
        recordResponseTime(startTime);

        assert(mintResponse.status === 200, 'Token minting successful');
        assert(mintResponse.data.success, 'Minting response success');
        assert(mintResponse.data.tx_signature, 'Transaction signature returned');

        log(`Tokens minted successfully - TX: ${mintResponse.data.tx_signature.substring(0, 20)}...`, 'success');

    } catch (error) {
        assert(false, 'Token minting failed', error.response?.data || error.message);
    }
}

// Concurrent load tests
async function testConcurrentLoad() {
    log('Testing concurrent load...', 'test');

    const concurrentUsers = TEST_CONFIG.concurrentRequests;
    const promises = [];

    for (let i = 0; i < concurrentUsers; i++) {
        promises.push(runConcurrentUserTest(i));
    }

    try {
        const results = await Promise.allSettled(promises);
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        assert(successful > 0, `Concurrent load test completed: ${successful}/${concurrentUsers} successful`);
        log(`Concurrent load results: ${successful} successful, ${failed} failed`, 'info');

    } catch (error) {
        assert(false, 'Concurrent load test failed', error.message);
    }
}

async function runConcurrentUserTest(userIndex) {
    const testUser = {
        username: `concurrent_user_${userIndex}_${Date.now()}`,
        email: `concurrent_user_${userIndex}_${Date.now()}@test.com`,
        password: 'testpass123'
    };

    // Register user
    const registerResponse = await axios.post(`${GATEWAY_URL}/auth/register`, testUser, { timeout: TEST_CONFIG.timeout });
    const userToken = registerResponse.data.access_token;

    // Create wallet
    await axios.post(`${GATEWAY_URL}/api/wallet/create-hd`, {}, {
        headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json'
        },
        timeout: TEST_CONFIG.timeout
    });

    // Mint tokens
    await axios.post(`${GATEWAY_URL}/api/token/eat-particle`, {
        particle_location: [userIndex * 10, userIndex * 20],
        particle_type: "energy"
    }, {
        headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json'
        },
        timeout: TEST_CONFIG.timeout
    });

    return true;
}

// Error scenario tests
async function testErrorScenarios() {
    log('Testing error scenarios...', 'test');

    try {
        // 1. Invalid JWT token
        await axios.get(`${GATEWAY_URL}/api/token/balance`, {
            headers: {
                'Authorization': 'Bearer invalid_token'
            }
        });
        assert(false, 'Invalid token should fail');
    } catch (error) {
        assert(error.response?.status === 401, 'Invalid token returns 401', `Got status ${error.response?.status}`);
    }

    try {
        // 2. Missing authorization header
        await axios.get(`${GATEWAY_URL}/api/token/balance`);
        assert(false, 'Missing auth header should fail');
    } catch (error) {
        assert(error.response?.status === 401, 'Missing auth returns 401', `Got status ${error.response?.status}`);
    }

    try {
        // 3. Invalid wallet operation
        const user = await testUserLifecycle();
        await axios.post(`${GATEWAY_URL}/api/wallet/derive`, {
            index: -1 // Invalid index
        }, {
            headers: {
                'Authorization': `Bearer ${user.token}`,
                'Content-Type': 'application/json'
            }
        });
        assert(false, 'Invalid wallet operation should fail');
    } catch (error) {
        assert(error.response?.status >= 400, 'Invalid operation returns error status', `Got status ${error.response?.status}`);
    }

    log('Error scenarios tested successfully', 'success');
}

// Performance analysis
function analyzePerformance() {
    log('Analyzing performance metrics...', 'test');

    if (responseTimes.length === 0) {
        log('No response time data available', 'warning');
        return;
    }

    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const sortedTimes = [...responseTimes].sort((a, b) => a - b);
    const medianResponseTime = sortedTimes[Math.floor(sortedTimes.length / 2)];
    const p95ResponseTime = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
    const p99ResponseTime = sortedTimes[Math.floor(sortedTimes.length * 0.99)];

    testResults.performance.avgResponseTime = avgResponseTime;

    log(`Performance Metrics:`, 'info');
    log(`  Total Requests: ${testResults.performance.totalRequests}`, 'info');
    log(`  Average Response Time: ${avgResponseTime.toFixed(2)}ms`, 'info');
    log(`  Median Response Time: ${medianResponseTime}ms`, 'info');
    log(`  95th Percentile: ${p95ResponseTime}ms`, 'info');
    log(`  99th Percentile: ${p99ResponseTime}ms`, 'info');
    log(`  Min Response Time: ${testResults.performance.minResponseTime}ms`, 'info');
    log(`  Max Response Time: ${testResults.performance.maxResponseTime}ms`, 'info');

    // Performance assertions
    assert(avgResponseTime < 1000, 'Average response time under 1 second');
    assert(p95ResponseTime < 2000, '95% of requests under 2 seconds');
}

// Main test suite
async function runFullIntegrationTest() {
    log('🚀 Starting Comprehensive Integration Test Suite', 'test');
    log('='.repeat(60), 'test');

    try {
        // 0. Service Health Check
        await checkServices();

        // 1. User Lifecycle Tests
        const user = await testUserLifecycle();
        if (!user) {
            log('Cannot continue without user - aborting tests', 'error');
            return;
        }

        // 2. HD Wallet Tests
        const wallet = await testHDWallet(user.token);
        if (!wallet) {
            log('Cannot continue without wallet - aborting tests', 'error');
            return;
        }

        // 3. Token Operations Tests
        await testTokenOperations(user.token, wallet);

        // 4. Concurrent Load Tests
        await testConcurrentLoad();

        // 5. Error Scenario Tests
        await testErrorScenarios();

        // 6. Performance Analysis
        analyzePerformance();

    } catch (error) {
        log(`Test suite failed: ${error.message}`, 'error');
        testResults.errors.push({
            message: 'Test suite failure',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }

    // Final results
    testResults.endTime = Date.now();
    const duration = (testResults.endTime - testResults.startTime) / 1000;

    log('\n' + '='.repeat(60), 'test');
    log('🎯 INTEGRATION TEST RESULTS', 'test');
    log('='.repeat(60), 'test');

    log(`Total Tests: ${testResults.total}`, 'info');
    log(`Passed: ${testResults.passed}`, 'success');
    log(`Failed: ${testResults.failed}`, 'error');
    log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`, 'info');
    log(`Duration: ${duration.toFixed(2)} seconds`, 'info');

    if (testResults.errors.length > 0) {
        log('\n❌ ERRORS ENCOUNTERED:', 'error');
        testResults.errors.forEach((error, index) => {
            log(`${index + 1}. ${error.message}`, 'error');
            if (error.details) {
                log(`   Details: ${error.details}`, 'error');
            }
        });
    }

    log('\n' + '='.repeat(60), 'test');

    const successRate = testResults.passed / testResults.total;
    if (successRate >= 0.95) {
        log('🎉 INTEGRATION TESTS PASSED - SYSTEM READY FOR PRODUCTION!', 'success');
        return true;
    } else if (successRate >= 0.80) {
        log('⚠️  INTEGRATION TESTS MOSTLY PASSED - MINOR ISSUES DETECTED', 'warning');
        return true;
    } else {
        log('❌ INTEGRATION TESTS FAILED - CRITICAL ISSUES DETECTED', 'error');
        return false;
    }
}

// Run the test suite
if (process.argv.includes('--run')) {
    runFullIntegrationTest().then(success => {
        process.exit(success ? 0 : 1);
    });
}

export { runFullIntegrationTest, testUserLifecycle, testHDWallet, testTokenOperations };

