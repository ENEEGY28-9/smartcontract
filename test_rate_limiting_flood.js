#!/usr/bin/env node

// Flood test to trigger rate limiting
const http = require('http');

class FloodTester {
    constructor() {
        this.baseUrl = 'http://localhost:8080';
        this.results = {
            total: 0,
            success: 0,
            rateLimited: 0,
            errors: 0,
            responseTimes: []
        };
        this.startTime = null;
    }

    async makeRequest(requestId) {
        const startTime = Date.now();

        return new Promise((resolve) => {
            const testData = JSON.stringify({
                name: `Flood Test Room ${requestId}`,
                maxPlayers: 4,
                gameMode: "classic",
                hostName: `Player ${requestId}`
            });

            const options = {
                hostname: 'localhost',
                port: 8080,
                path: '/api/rooms/create',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(testData),
                    'User-Agent': `FloodTest/${requestId}`,
                    'X-Forwarded-For': `192.168.1.${100 + (requestId % 255)}`, // Rotate IPs
                    'X-Client-ID': `client_${Math.floor(requestId / 10)}` // Group by 10
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
                    console.log(`🚫 Request ${requestId}: Rate limited (429) - ${responseTime}ms`);
                } else if (res.statusCode === 404) {
                    this.results.success++;
                    console.log(`✅ Request ${requestId}: Endpoint not found (404) - ${responseTime}ms`);
                } else {
                    this.results.errors++;
                    console.log(`❌ Request ${requestId}: Error (${res.statusCode}) - ${responseTime}ms`);
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

                console.log(`🔥 Request ${requestId}: Connection error - ${responseTime}ms`);

                resolve();
            });

            req.on('timeout', () => {
                const endTime = Date.now();
                const responseTime = endTime - startTime;

                this.results.total++;
                this.results.errors++;
                this.results.responseTimes.push(responseTime);

                console.log(`⏰ Request ${requestId}: Timeout - ${responseTime}ms`);
                req.destroy();
                resolve();
            });

            req.write(testData);
            req.end();
        });
    }

    async runFloodTest(totalRequests = 200, concurrency = 20) {
        console.log('🌊 Starting Flood Test for Rate Limiting');
        console.log('=====================================');
        console.log(`📊 Total Requests: ${totalRequests}`);
        console.log(`👥 Concurrency: ${concurrency}`);
        console.log(`🎯 Target: Test if rate limits are working`);
        console.log('=====================================\n');

        this.startTime = Date.now();

        // Process requests in batches
        for (let batch = 0; batch < totalRequests; batch += concurrency) {
            const batchPromises = [];

            for (let i = 0; i < concurrency && (batch + i) < totalRequests; i++) {
                const requestId = batch + i + 1;
                batchPromises.push(this.makeRequest(requestId));
            }

            await Promise.all(batchPromises);

            // Small delay between batches to avoid overwhelming
            await new Promise(resolve => setTimeout(resolve, 50));

            // Print progress every 50 requests
            if ((batch + concurrency) % 50 === 0) {
                const currentTime = Date.now();
                const elapsed = currentTime - this.startTime;
                const rate = (batch + concurrency) / (elapsed / 1000);

                console.log(`📈 Progress: ${batch + concurrency}/${totalRequests} (${rate.toFixed(1)} req/s)`);
            }
        }

        this.printResults();
    }

    printResults() {
        const endTime = Date.now();
        const totalTime = endTime - this.startTime;
        const avgResponseTime = this.results.responseTimes.reduce((a, b) => a + b, 0) / this.results.responseTimes.length;

        console.log('\n🎯 FLOOD TEST RESULTS');
        console.log('===================');
        console.log(`⏱️  Total Time: ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)`);
        console.log(`📊 Total Requests: ${this.results.total}`);
        console.log(`✅ Success/404: ${this.results.success} (${((this.results.success/this.results.total)*100).toFixed(1)}%)`);
        console.log(`🚫 Rate Limited (429): ${this.results.rateLimited} (${((this.results.rateLimited/this.results.total)*100).toFixed(1)}%)`);
        console.log(`❌ Errors: ${this.results.errors} (${((this.results.errors/this.results.total)*100).toFixed(1)}%)`);
        console.log(`⚡ Avg Response Time: ${avgResponseTime.toFixed(0)}ms`);
        console.log(`📈 Requests/Second: ${(this.results.total/(totalTime/1000)).toFixed(1)}`);

        // Analyze rate limiting
        const rateLimitPercentage = (this.results.rateLimited/this.results.total)*100;

        if (this.results.rateLimited > 0) {
            console.log('\n🎉 RATE LIMITING IS WORKING!');
            console.log(`   Successfully blocked ${this.results.rateLimited} requests with 429`);
        } else {
            console.log('\n⚠️  No rate limiting detected');
            console.log('   Either rate limits are too high or not implemented');
        }

        // Performance analysis
        if (rateLimitPercentage >= 5 && rateLimitPercentage <= 25) {
            console.log('\n📊 OPTIMAL RATE LIMITING');
            console.log(`   Rate limit errors: ${rateLimitPercentage.toFixed(1)}%`);
            console.log('   This is within expected range for high-load scenarios');
        } else if (rateLimitPercentage > 25) {
            console.log('\n🔧 RATE LIMITS TOO AGGRESSIVE');
            console.log(`   Rate limit errors: ${rateLimitPercentage.toFixed(1)}%`);
            console.log('   Consider increasing rate limits for better user experience');
        } else if (rateLimitPercentage < 5 && this.results.rateLimited === 0) {
            console.log('\n⚡ RATE LIMITS TOO PERMISSIVE');
            console.log('   No rate limiting detected');
            console.log('   May need lower limits to prevent abuse');
        }

        // Compare with target
        if (rateLimitPercentage < 5) {
            console.log('\n✅ TARGET ACHIEVED: <5% rate limit errors');
        } else {
            console.log(`\n📈 Current: ${rateLimitPercentage.toFixed(1)}% rate limit errors`);
            console.log('   Target: <5% | Need improvement');
        }
    }

    async checkGatewayHealth() {
        return new Promise((resolve) => {
            const options = {
                hostname: 'localhost',
                port: 8080,
                path: '/api/rooms/create',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            };

            const testData = JSON.stringify({
                name: "Health Check",
                maxPlayers: 2,
                gameMode: "test",
                hostName: "HealthCheck"
            });

            const req = http.request(options, (res) => {
                resolve(res.statusCode !== undefined);
            });

            req.on('error', () => resolve(false));
            req.on('timeout', () => resolve(false));

            req.write(testData);
            req.end();
        });
    }
}

async function main() {
    const tester = new FloodTester();

    // Check if gateway is healthy
    console.log('🔍 Checking gateway health...\n');

    const isHealthy = await tester.checkGatewayHealth();

    if (!isHealthy) {
        console.log('❌ Gateway is not responding');
        console.log('💡 Please ensure gateway is running: cd gateway && cargo run');
        process.exit(1);
    }

    console.log('✅ Gateway is responding\n');

    // Run flood test
    await tester.runFloodTest(150, 15); // 150 requests, 15 concurrent
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = FloodTester;
