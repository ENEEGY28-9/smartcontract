#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEST_SCENARIOS = [
    {
        name: 'HTTP API Load Test',
        config: 'artillery-http-api.yml',
        duration: '5 minutes',
        description: 'Tests HTTP API endpoints under load'
    },
    {
        name: 'WebSocket Connection Test',
        config: 'artillery-websocket.yml',
        duration: '3 minutes',
        description: 'Tests WebSocket connections and real-time gameplay'
    },
    {
        name: 'Mixed Workload Test',
        config: 'artillery-mixed-workload.yml',
        duration: '8 minutes',
        description: 'Tests mixed HTTP and WebSocket workloads'
    },
    {
        name: 'Gaming Stress Test',
        config: 'artillery-gaming-stress.yml',
        duration: '10 minutes',
        description: 'Realistic gaming scenarios with proper session patterns'
    },
    {
        name: 'Database Stress Test',
        config: 'artillery-database-stress.yml',
        duration: '8 minutes',
        description: 'Tests database performance and connection pooling'
    },
    {
        name: 'WebRTC Stress Test',
        config: 'artillery-webrtc-stress.yml',
        duration: '7 minutes',
        description: 'Tests WebRTC signaling and peer-to-peer connections'
    },
    {
        name: 'Production Simulation',
        config: 'artillery-production-simulation.yml',
        duration: '25 minutes',
        description: 'Realistic production-like user behavior simulation'
    }
];

const REPORTS_DIR = 'artillery-reports';

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

function runTest(scenario, index) {
    return new Promise((resolve, reject) => {
        console.log(`\n🚀 Running ${scenario.name}...`);
        console.log(`   Duration: ${scenario.duration}`);
        console.log(`   Description: ${scenario.description}`);

        const reportFile = path.join(REPORTS_DIR, `${scenario.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.json`);

        const artillery = spawn('artillery', [
            'run',
            '--output', reportFile,
            scenario.config
        ], {
            stdio: 'inherit',
            shell: true
        });

        artillery.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ ${scenario.name} completed successfully`);
                console.log(`   Report saved to: ${reportFile}`);
                resolve(reportFile);
            } else {
                console.error(`❌ ${scenario.name} failed with code ${code}`);
                reject(new Error(`${scenario.name} failed with code ${code}`));
            }
        });

        artillery.on('error', (error) => {
            console.error(`❌ Error running ${scenario.name}:`, error);
            reject(error);
        });
    });
}

async function runAllTests() {
    console.log('🎯 Starting Artillery Load Testing Suite');
    console.log('=' .repeat(50));

    const results = [];

    try {
        for (let i = 0; i < TEST_SCENARIOS.length; i++) {
            const scenario = TEST_SCENARIOS[i];
            console.log(`\n📊 Test ${i + 1}/${TEST_SCENARIOS.length}`);

            const reportFile = await runTest(scenario, i);
            results.push({
                scenario: scenario.name,
                reportFile,
                timestamp: new Date().toISOString()
            });

            // Cool down between tests (except for the last one)
            if (i < TEST_SCENARIOS.length - 1) {
                console.log('\n⏳ Cooling down for 30 seconds...');
                await new Promise(resolve => setTimeout(resolve, 30000));
            }
        }

        console.log('\n🎉 All tests completed!');
        console.log('\n📈 Results Summary:');
        console.log('=' .repeat(30));

        results.forEach((result, index) => {
            console.log(`${index + 1}. ${result.scenario}`);
            console.log(`   Report: ${result.reportFile}`);
            console.log(`   Time: ${result.timestamp}`);
            console.log('');
        });

        // Generate summary report
        const summary = {
            testRun: {
                timestamp: new Date().toISOString(),
                totalTests: results.length,
                successCount: results.length,
                duration: 'Full test suite'
            },
            results: results,
            recommendations: [
                'Monitor system metrics during tests',
                'Check error rates in reports',
                'Analyze response times and throughput',
                'Review WebSocket connection stability',
                'Validate database performance under load'
            ]
        };

        const summaryFile = path.join(REPORTS_DIR, `test-summary-${Date.now()}.json`);
        fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

        console.log(`📋 Test summary saved to: ${summaryFile}`);

    } catch (error) {
        console.error('\n❌ Test suite failed:', error.message);
        process.exit(1);
    }
}

async function runSpecificTest(testName) {
    let scenarios = [];

    switch (testName) {
        case 'http':
            scenarios = TEST_SCENARIOS.filter(s => s.name.includes('HTTP API'));
            break;
        case 'websocket':
            scenarios = TEST_SCENARIOS.filter(s => s.name.includes('WebSocket'));
            break;
        case 'mixed':
            scenarios = TEST_SCENARIOS.filter(s => s.name.includes('Mixed Workload'));
            break;
        case 'gaming':
            scenarios = TEST_SCENARIOS.filter(s => s.name.includes('Gaming Stress'));
            break;
        case 'database':
            scenarios = TEST_SCENARIOS.filter(s => s.name.includes('Database Stress'));
            break;
        case 'webrtc':
            scenarios = TEST_SCENARIOS.filter(s => s.name.includes('WebRTC Stress'));
            break;
        case 'stress':
            scenarios = TEST_SCENARIOS.filter(s => s.name.includes('Gaming Stress') || s.name.includes('Database Stress') || s.name.includes('WebRTC Stress'));
            break;
        case 'production':
            scenarios = TEST_SCENARIOS.filter(s => s.name.includes('Production Simulation'));
            break;
        default:
            const scenario = TEST_SCENARIOS.find(s => s.name.toLowerCase().includes(testName.toLowerCase()));
            if (scenario) {
                scenarios = [scenario];
            }
            break;
    }

    if (scenarios.length === 0) {
        console.error(`❌ Test scenario not found: ${testName}`);
        console.log('\nAvailable scenarios:');
        TEST_SCENARIOS.forEach(s => console.log(`  - ${s.name}`));
        process.exit(1);
    }

    try {
        for (let i = 0; i < scenarios.length; i++) {
            console.log(`\n📊 Running specific test: ${scenarios[i].name}`);
            await runTest(scenarios[i], 0);

            // Cool down between tests
            if (i < scenarios.length - 1) {
                console.log('\n⏳ Cooling down for 30 seconds...');
                await new Promise(resolve => setTimeout(resolve, 30000));
            }
        }
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    }
}

function showHelp() {
    console.log(`
🎯 Artillery Load Testing Suite for GameV1 Backend

Usage:
  node run-artillery-tests.js [options]

Options:
  --all              Run all test scenarios (default)
  --http             Run only HTTP API tests
  --websocket        Run only WebSocket tests
  --mixed            Run only mixed workload tests
  --gaming           Run only gaming stress tests
  --database         Run only database stress tests
  --webrtc           Run only WebRTC stress tests
  --stress           Run only stress tests (legacy)
  --production       Run only production simulation
  --help             Show this help message

Examples:
  node run-artillery-tests.js --all
  node run-artillery-tests.js --stress
  node run-artillery-tests.js --production

Test Scenarios:
  1. HTTP API Load Test - Tests REST API endpoints
  2. WebSocket Connection Test - Tests real-time connections
  3. Mixed Workload Test - Combined HTTP + WebSocket load
  4. Gaming Stress Test - Realistic gaming scenarios
  5. Database Stress Test - Database performance testing
  6. WebRTC Stress Test - WebRTC and P2P testing
  7. Production Simulation - Realistic user behavior patterns

Reports are saved to: artillery-reports/
`);
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
}

if (args.length === 0 || args.includes('--all')) {
    runAllTests();
} else {
    const testName = args[0].replace('--', '');
    runSpecificTest(testName);
}
