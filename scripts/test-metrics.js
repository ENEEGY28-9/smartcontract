#!/usr/bin/env node

/**
 * GameV1 Metrics Test Script
 * Tests all metrics endpoints and validates data collection
 */

const http = require('http');
const https = require('https');

// Configuration
const SERVICES = [
    {
        name: 'Gateway',
        url: 'http://localhost:8080/metrics',
        expected: ['gateway_response_time_seconds', 'gateway_active_connections', 'gateway_auth_success_total']
    },
    {
        name: 'Worker',
        url: 'http://localhost:3100/metrics',
        expected: ['worker_frame_time_seconds', 'worker_rpc_calls_total', 'worker_gameplay_events_total']
    },
    {
        name: 'Room Manager',
        url: 'http://localhost:3200/metrics',
        expected: ['room_manager_rooms_created_total', 'room_manager_active_rooms']
    }
];

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(color, message) {
    console.log(`${color}${message}${colors.reset}`);
}

function logService(name, message) {
    log(colors.cyan, `📊 [${name}] ${message}`);
}

function logSuccess(message) {
    log(colors.green, `✅ ${message}`);
}

function logError(message) {
    log(colors.red, `❌ ${message}`);
}

function logWarning(message) {
    log(colors.yellow, `⚠️  ${message}`);
}

function logInfo(message) {
    log(colors.blue, `ℹ️  ${message}`);
}

// HTTP request helper
function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https:') ? https : http;

        const req = protocol.get(url, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    data: data,
                    headers: res.headers
                });
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

// Test individual service metrics
async function testServiceMetrics(service) {
    const { name, url, expected } = service;

    try {
        logService(name, `Testing metrics endpoint: ${url}`);

        const response = await makeRequest(url);

        if (response.statusCode !== 200) {
            logError(`${name} returned status ${response.statusCode}`);
            return false;
        }

        const metricsText = response.data;
        const lines = metricsText.split('\n');
        const metrics = lines.filter(line => line && !line.startsWith('#'));

        logInfo(`${name} returned ${metrics.length} metrics`);

        // Check for expected metrics
        let foundExpected = 0;
        const foundMetrics = [];

        for (const expectedMetric of expected) {
            const found = metrics.some(metric => metric.includes(expectedMetric));
            if (found) {
                foundExpected++;
                foundMetrics.push(expectedMetric);
                logSuccess(`Found expected metric: ${expectedMetric}`);
            } else {
                logWarning(`Missing expected metric: ${expectedMetric}`);
            }
        }

        // Check for common metrics patterns
        const hasHelpComments = lines.some(line => line.startsWith('# HELP'));
        const hasTypeComments = lines.some(line => line.startsWith('# TYPE'));

        if (hasHelpComments) {
            logSuccess(`${name} includes HELP comments`);
        } else {
            logWarning(`${name} missing HELP comments`);
        }

        if (hasTypeComments) {
            logSuccess(`${name} includes TYPE comments`);
        } else {
            logWarning(`${name} missing TYPE comments`);
        }

        // Validate metrics format
        const invalidLines = metrics.filter(line => {
            const parts = line.split(' ');
            return parts.length < 2 || isNaN(parseFloat(parts[1]));
        });

        if (invalidLines.length === 0) {
            logSuccess(`${name} metrics format is valid`);
        } else {
            logWarning(`${name} has ${invalidLines.length} invalid metric lines`);
        }

        // Show sample metrics
        const sampleMetrics = metrics.slice(0, 5);
        logInfo(`${name} sample metrics:`);
        sampleMetrics.forEach(metric => {
            log(colors.magenta, `   ${metric}`);
        });

        return foundExpected === expected.length;

    } catch (error) {
        logError(`${name} request failed: ${error.message}`);
        return false;
    }
}

// Test Prometheus configuration
async function testPrometheusConfig() {
    log(colors.blue, '🧪 Testing Prometheus configuration...');

    const prometheusUrl = 'http://localhost:9090/-/healthy';

    try {
        const response = await makeRequest(prometheusUrl);

        if (response.statusCode === 200) {
            logSuccess('Prometheus is healthy');
            return true;
        } else {
            logWarning(`Prometheus health check returned ${response.statusCode}`);
            return false;
        }
    } catch (error) {
        logWarning(`Prometheus health check failed: ${error.message}`);
        return false;
    }
}

// Test Grafana (if available)
async function testGrafana() {
    log(colors.blue, '🧪 Testing Grafana...');

    const grafanaUrl = 'http://localhost:3000/api/health';

    try {
        const response = await makeRequest(grafanaUrl);

        if (response.statusCode === 200) {
            logSuccess('Grafana is healthy');
            return true;
        } else {
            logWarning(`Grafana health check returned ${response.statusCode}`);
            return false;
        }
    } catch (error) {
        logWarning(`Grafana health check failed: ${error.message}`);
        return false;
    }
}

// Main test function
async function runTests() {
    console.log('🚀 GameV1 Metrics Test Suite');
    console.log('===============================');
    console.log('');

    let totalTests = 0;
    let passedTests = 0;

    // Test Prometheus health
    totalTests++;
    if (await testPrometheusConfig()) {
        passedTests++;
    }

    // Test Grafana health
    totalTests++;
    if (await testGrafana()) {
        passedTests++;
    }

    // Test each service
    for (const service of SERVICES) {
        totalTests++;
        if (await testServiceMetrics(service)) {
            passedTests++;
        }
    }

    // Summary
    console.log('');
    console.log('===============================');
    console.log('📊 Test Results Summary:');
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${totalTests - passedTests}`);
    console.log(`   Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    console.log('');

    if (passedTests === totalTests) {
        logSuccess('🎉 All tests passed! Metrics system is working correctly.');
        console.log('');
        console.log('📝 Next steps:');
        console.log('   1. Open Prometheus: http://localhost:9090');
        console.log('   2. Open Grafana: http://localhost:3000');
        console.log('   3. Import dashboard: config/grafana/dashboards/gamev1-overview.json');
        console.log('   4. Start your game services to see real metrics');
    } else {
        logWarning('⚠️  Some tests failed. Check the output above for details.');
        console.log('');
        console.log('🔧 Troubleshooting:');
        console.log('   1. Ensure all services are running');
        console.log('   2. Check service logs for errors');
        console.log('   3. Verify port availability');
        console.log('   4. Check firewall settings');
    }

    process.exit(passedTests === totalTests ? 0 : 1);
}

// Handle script arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
    console.log('GameV1 Metrics Test Script');
    console.log('');
    console.log('Usage: node test-metrics.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --help, -h    Show this help message');
    console.log('  --service     Test only a specific service (gateway|worker|room-manager)');
    console.log('  --prometheus  Test only Prometheus');
    console.log('  --grafana     Test only Grafana');
    console.log('');
    console.log('Examples:');
    console.log('  node test-metrics.js');
    console.log('  node test-metrics.js --service gateway');
    process.exit(0);
}

// Run tests
runTests().catch(error => {
    console.error('Test script failed:', error);
    process.exit(1);
});
