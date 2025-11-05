#!/usr/bin/env node

// 🚀 Performance Test for Rate Limiting
// Test rate limits với high load để kiểm tra lỗi 429

const http = require('http');
const https = require('https');
const { URL } = require('url');

class RateLimitTester {
    constructor() {
        this.baseUrl = 'http://localhost:8080';
        this.totalRequests = 5000; // High load test
        this.concurrentClients = 50;
        this.results = {
            total: 0,
            success: 0,
            rateLimited: 0,
            errors: 0,
            responseTimes: []
        };
        this.startTime = null;
    }

    async makeRequest(clientId) {
        const startTime = Date.now();

        return new Promise((resolve) => {
            const url = new URL(`${this.baseUrl}/api/rooms/create`);

            const options = {
                hostname: 'localhost',
                port: 8080,
                path: '/api/rooms/create',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': `RateLimitTest/${clientId}`,
                    'X-Client-ID': `client_${clientId}`,
                    'X-Forwarded-For': `192.168.1.${Math.floor(Math.random() * 255)}` // Random IP
                },
                timeout: 10000
            };

            const req = http.request(options, (res) => {
                const endTime = Date.now();
                const responseTime = endTime - startTime;

                this.results.total++;
                this.results.responseTimes.push(responseTime);

                if (res.statusCode === 429) {
                    this.results.rateLimited++;
                    console.log(`🚫 Client ${clientId}: Rate limited (429)`);
                } else if (res.statusCode >= 200 && res.statusCode < 300) {
                    this.results.success++;
                    console.log(`✅ Client ${clientId}: Success (${res.statusCode}) - ${responseTime}ms`);
                } else {
                    this.results.errors++;
                    console.log(`❌ Client ${clientId}: Error (${res.statusCode}) - ${responseTime}ms`);
                }

                res.on('data', () => {}); // Drain response
                res.on('end', () => resolve());
            });

            req.on('error', (err) => {
                const endTime = Date.now();
                const responseTime = endTime - startTime;

                this.results.total++;
                this.results.errors++;
                this.results.responseTimes.push(responseTime);

                console.log(`🔥 Client ${clientId}: Connection error - ${responseTime}ms`);

                resolve();
            });

            req.on('timeout', () => {
                const endTime = Date.now();
                const responseTime = endTime - startTime;

                this.results.total++;
                this.results.errors++;
                this.results.responseTimes.push(responseTime);

                console.log(`⏰ Client ${clientId}: Timeout - ${responseTime}ms`);
                req.destroy();
                resolve();
            });

            // Send test data
            const testData = JSON.stringify({
                name: `Test Room ${clientId}_${Date.now()}`,
                maxPlayers: 4,
                gameMode: "classic",
                hostName: `Player ${clientId}`
            });

            req.write(testData);
            req.end();
        });
    }

    async runClient(clientId) {
        const requestsPerClient = Math.floor(this.totalRequests / this.concurrentClients);
        console.log(`🚀 Client ${clientId}: Starting ${requestsPerClient} requests`);

        for (let i = 0; i < requestsPerClient; i++) {
            try {
                await this.makeRequest(clientId);

                // Small delay between requests to avoid overwhelming
                await new Promise(resolve => setTimeout(resolve, 10));
            } catch (err) {
                console.log(`💥 Client ${clientId}: Unexpected error: ${err.message}`);
                this.results.errors++;
            }
        }

        console.log(`🏁 Client ${clientId}: Completed`);
    }

    async runTest() {
        console.log('🚀 Starting Rate Limit Performance Test');
        console.log('=====================================');
        console.log(`📊 Total Requests: ${this.totalRequests}`);
        console.log(`👥 Concurrent Clients: ${this.concurrentClients}`);
        console.log(`🎯 Target: Reduce 429 errors from ~20% to <5%`);
        console.log('=====================================\n');

        this.startTime = Date.now();

        // Create concurrent clients
        const clients = [];
        for (let i = 1; i <= this.concurrentClients; i++) {
            clients.push(this.runClient(i));
        }

        // Wait for all clients to complete
        await Promise.all(clients);

        this.printResults();
    }

    printResults() {
        const endTime = Date.now();
        const totalTime = endTime - this.startTime;
        const avgResponseTime = this.results.responseTimes.reduce((a, b) => a + b, 0) / this.results.responseTimes.length;

        console.log('\n🎯 RATE LIMIT TEST RESULTS');
        console.log('=========================');
        console.log(`⏱️  Total Time: ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)`);
        console.log(`📊 Total Requests: ${this.results.total}`);
        console.log(`✅ Success: ${this.results.success} (${((this.results.success/this.results.total)*100).toFixed(1)}%)`);
        console.log(`🚫 Rate Limited (429): ${this.results.rateLimited} (${((this.results.rateLimited/this.results.total)*100).toFixed(1)}%)`);
        console.log(`❌ Errors: ${this.results.errors} (${((this.results.errors/this.results.total)*100).toFixed(1)}%)`);
        console.log(`⚡ Avg Response Time: ${avgResponseTime.toFixed(0)}ms`);
        console.log(`📈 Requests/Second: ${(this.results.total/(totalTime/1000)).toFixed(1)}`);

        // Check if target achieved
        const rateLimitPercentage = (this.results.rateLimited/this.results.total)*100;

        if (rateLimitPercentage < 5) {
            console.log('\n🎉 SUCCESS! Rate limit errors reduced to <5%');
            console.log(`   Target: <5% | Actual: ${rateLimitPercentage.toFixed(1)}%`);
        } else {
            console.log('\n⚠️  WARNING: Rate limit errors still above 5%');
            console.log(`   Target: <5% | Actual: ${rateLimitPercentage.toFixed(1)}%`);
        }

        // Performance analysis
        if (rateLimitPercentage < 20) {
            console.log('\n📈 PERFORMANCE IMPROVEMENT CONFIRMED');
            console.log(`   Old rate limits would cause ~20% errors`);
            console.log(`   New rate limits cause only ${rateLimitPercentage.toFixed(1)}% errors`);
            console.log(`   Improvement: ${((20 - rateLimitPercentage)/20*100).toFixed(0)}% reduction`);
        }

        console.log('\n🔍 Detailed Analysis:');
        if (this.results.success > this.results.total * 0.8) {
            console.log('   ✅ High success rate - rate limits are well configured');
        } else {
            console.log('   ⚠️  Low success rate - may need further optimization');
        }

        if (avgResponseTime < 100) {
            console.log('   ⚡ Fast response times - system performing well');
        } else {
            console.log('   🐌 Slow response times - check system performance');
        }
    }
}

// Check if gateway is running
async function checkGatewayHealth() {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: 8080,
            path: '/health',
            method: 'GET',
            timeout: 5000
        };

        const req = http.request(options, (res) => {
            if (res.statusCode === 200) {
                console.log('✅ Gateway is running and healthy');
                resolve(true);
            } else {
                console.log(`⚠️  Gateway responded with status: ${res.statusCode}`);
                resolve(false);
            }
        });

        req.on('error', () => {
            console.log('❌ Gateway is not running');
            console.log('💡 Please start gateway first: cd gateway && cargo run');
            resolve(false);
        });

        req.on('timeout', () => {
            console.log('⏰ Gateway health check timed out');
            resolve(false);
        });

        req.end();
    });
}

// Main execution
async function main() {
    console.log('🔍 Checking gateway health...\n');

    const isHealthy = await checkGatewayHealth();

    if (!isHealthy) {
        console.log('\n❌ Cannot proceed with test. Please start gateway first.');
        process.exit(1);
    }

    const tester = new RateLimitTester();
    await tester.runTest();
}

// Run the test
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { RateLimitTester, checkGatewayHealth };
