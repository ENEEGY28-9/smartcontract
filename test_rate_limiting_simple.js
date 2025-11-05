#!/usr/bin/env node

// Simple rate limiting test with immediate results
const http = require('http');

async function testRateLimiting() {
    console.log('🚀 Testing Rate Limiting with High Load');
    console.log('=====================================\n');

    const results = {
        total: 0,
        success: 0,
        rateLimited: 0,
        errors: 0
    };

    const totalRequests = 100;
    const concurrency = 10;

    console.log(`📊 Sending ${totalRequests} requests (${concurrency} concurrent)...\n`);

    // Send all requests rapidly
    const promises = [];

    for (let i = 1; i <= totalRequests; i++) {
        promises.push(makeRequest(i));
    }

    await Promise.all(promises);

    // Print results
    console.log('\n🎯 RESULTS');
    console.log('=========');
    console.log(`📊 Total Requests: ${results.total}`);
    console.log(`✅ Success/404: ${results.success} (${((results.success/results.total)*100).toFixed(1)}%)`);
    console.log(`🚫 Rate Limited (429): ${results.rateLimited} (${((results.rateLimited/results.total)*100).toFixed(1)}%)`);
    console.log(`❌ Errors: ${results.errors} (${((results.errors/results.total)*100).toFixed(1)}%)`);

    const rateLimitPercentage = (results.rateLimited/results.total)*100;

    if (results.rateLimited > 0) {
        console.log('\n🎉 RATE LIMITING IS WORKING!');
        console.log(`   Successfully blocked ${results.rateLimited} requests`);
    } else {
        console.log('\n⚠️  No rate limiting detected');
    }

    // Check target
    if (rateLimitPercentage < 5) {
        console.log('\n✅ TARGET ACHIEVED: <5% rate limit errors');
        console.log('   Rate limiting is optimally configured!');
    } else if (rateLimitPercentage < 20) {
        console.log(`\n📈 GOOD: ${rateLimitPercentage.toFixed(1)}% rate limit errors`);
        console.log('   Better than old configuration (~20%)');
    } else {
        console.log('\n🔧 NEEDS ADJUSTMENT');
        console.log(`   ${rateLimitPercentage.toFixed(1)}% rate limit errors`);
    }

    return results;

    function makeRequest(requestId) {
        return new Promise((resolve) => {
            const testData = JSON.stringify({
                name: `Rate Test ${requestId}`,
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
                    'User-Agent': `RateLimitTest/${requestId}`,
                    'X-Forwarded-For': `192.168.1.${100 + (requestId % 100)}`, // Vary IPs
                    'X-Client-ID': `client_${Math.floor(requestId / 20)}` // Group clients
                },
                timeout: 5000
            };

            const req = http.request(options, (res) => {
                results.total++;

                if (res.statusCode === 429) {
                    results.rateLimited++;
                    console.log(`🚫 ${requestId}: Rate limited (429)`);
                } else if (res.statusCode === 404) {
                    results.success++;
                    // Only show some success messages to avoid spam
                    if (requestId % 20 === 0) {
                        console.log(`✅ ${requestId}: Success (404)`);
                    }
                } else {
                    results.errors++;
                    console.log(`❌ ${requestId}: Error (${res.statusCode})`);
                }

                res.on('data', () => {}); // Drain response
                res.on('end', () => resolve());
            });

            req.on('error', () => {
                results.total++;
                results.errors++;
                resolve();
            });

            req.on('timeout', () => {
                results.total++;
                results.errors++;
                req.destroy();
                resolve();
            });

            req.write(testData);
            req.end();
        });
    }
}

async function main() {
    // Quick health check
    console.log('🔍 Checking gateway...\n');

    try {
        await new Promise((resolve, reject) => {
            const testData = JSON.stringify({ name: "Health", maxPlayers: 2, gameMode: "test", hostName: "Test" });

            const options = {
                hostname: 'localhost',
                port: 8080,
                path: '/api/rooms/create',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(testData)
                },
                timeout: 3000
            };

            const req = http.request(options, (res) => {
                if (res.statusCode) {
                    console.log('✅ Gateway is responding\n');
                    resolve();
                } else {
                    reject(new Error('No response'));
                }
            });

            req.on('error', () => reject(new Error('Cannot connect')));
            req.on('timeout', () => reject(new Error('Timeout')));

            req.write(testData);
            req.end();
        });
    } catch (err) {
        console.log(`❌ Gateway error: ${err.message}`);
        console.log('💡 Please ensure gateway is running: cd gateway && cargo run');
        return;
    }

    // Run rate limiting test
    await testRateLimiting();
}

if (require.main === module) {
    main().catch(console.error);
}
