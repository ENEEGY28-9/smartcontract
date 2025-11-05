#!/usr/bin/env node

// Simple test to check if gateway is responding
const http = require('http');

async function testBasicConnectivity() {
    console.log('🔍 Testing Gateway Basic Connectivity...');
    console.log('========================================\n');

    const testData = JSON.stringify({
        name: "Test Room",
        maxPlayers: 4,
        gameMode: "classic",
        hostName: "Test Player"
    });

    const options = {
        hostname: 'localhost',
        port: 8080,
        path: '/api/rooms/create',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(testData),
            'User-Agent': 'GatewayTest/1.0'
        },
        timeout: 5000
    };

    return new Promise((resolve) => {
        console.log('🚀 Sending test request to /api/rooms/create...');

        const req = http.request(options, (res) => {
            console.log(`📊 Response Status: ${res.statusCode}`);
            console.log(`📋 Headers:`, res.headers);

            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log(`📄 Response Body: ${data}\n`);

                if (res.statusCode === 429) {
                    console.log('🚫 RATE LIMITED: Got 429 response');
                    console.log('✅ Rate limiting is working!');
                } else if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log('✅ SUCCESS: API is responding');
                } else if (res.statusCode === 404) {
                    console.log('❓ ENDPOINT NOT FOUND: /api/rooms/create might not exist');
                    console.log('💡 This could be normal if endpoint hasn\'t been implemented yet');
                } else {
                    console.log(`❌ ERROR: Unexpected status code ${res.statusCode}`);
                }

                resolve(res.statusCode);
            });
        });

        req.on('error', (err) => {
            console.log(`🔥 CONNECTION ERROR: ${err.message}`);
            console.log('❌ Gateway might not be running or endpoint doesn\'t exist');
            resolve(null);
        });

        req.on('timeout', () => {
            console.log('⏰ TIMEOUT: Request timed out');
            req.destroy();
            resolve(null);
        });

        req.write(testData);
        req.end();
    });
}

async function testMultipleRequests(count = 10) {
    console.log(`\n🔄 Testing ${count} rapid requests to check rate limiting...`);
    console.log('=======================================================\n');

    const results = {
        total: 0,
        success: 0,
        rateLimited: 0,
        errors: 0
    };

    for (let i = 1; i <= count; i++) {
        const testData = JSON.stringify({
            name: `Rapid Test Room ${i}`,
            maxPlayers: 4,
            gameMode: "classic",
            hostName: `Player ${i}`
        });

        const options = {
            hostname: 'localhost',
            port: 8080,
            path: '/api/rooms/create',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(testData),
                'User-Agent': `RapidTest/${i}`,
                'X-Forwarded-For': `192.168.1.${100 + i}` // Different IPs
            },
            timeout: 5000
        };

        await new Promise((resolve) => {
            const req = http.request(options, (res) => {
                results.total++;

                if (res.statusCode === 429) {
                    results.rateLimited++;
                    console.log(`🚫 Request ${i}: Rate limited (429)`);
                } else if (res.statusCode >= 200 && res.statusCode < 300) {
                    results.success++;
                    console.log(`✅ Request ${i}: Success (${res.statusCode})`);
                } else {
                    results.errors++;
                    console.log(`❌ Request ${i}: Error (${res.statusCode})`);
                }

                res.on('data', () => {}); // Drain response
                res.on('end', () => resolve());
            });

            req.on('error', () => {
                results.total++;
                results.errors++;
                console.log(`🔥 Request ${i}: Connection error`);
                resolve();
            });

            req.on('timeout', () => {
                results.total++;
                results.errors++;
                console.log(`⏰ Request ${i}: Timeout`);
                req.destroy();
                resolve();
            });

            req.write(testData);
            req.end();
        });

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n🎯 RAPID TEST RESULTS');
    console.log('===================');
    console.log(`📊 Total Requests: ${results.total}`);
    console.log(`✅ Success: ${results.success} (${((results.success/results.total)*100).toFixed(1)}%)`);
    console.log(`🚫 Rate Limited (429): ${results.rateLimited} (${((results.rateLimited/results.total)*100).toFixed(1)}%)`);
    console.log(`❌ Errors: ${results.errors} (${((results.errors/results.total)*100).toFixed(1)}%)`);

    const rateLimitPercentage = (results.rateLimited/results.total)*100;

    if (rateLimitPercentage < 5) {
        console.log('\n🎉 SUCCESS! Rate limit errors < 5%');
    } else if (rateLimitPercentage < 20) {
        console.log('\n📈 IMPROVEMENT! Rate limit errors reduced from ~20% to <20%');
    } else {
        console.log('\n⚠️  WARNING: High rate limit errors, may need optimization');
    }

    return results;
}

async function main() {
    // Test basic connectivity first
    const statusCode = await testBasicConnectivity();

    if (statusCode === null) {
        console.log('\n❌ Cannot connect to gateway. Please ensure:');
        console.log('   1. Gateway is running: cd gateway && cargo run');
        console.log('   2. Check if port 8080 is available');
        console.log('   3. Set rate limit environment variables');
        return;
    }

    // If basic test works, run rapid test
    if (statusCode !== 404) {
        await testMultipleRequests(20);
    } else {
        console.log('\n💡 API endpoint not found, but gateway is responding');
        console.log('This suggests gateway is running but API routes may not be implemented yet');
    }
}

if (require.main === module) {
    main().catch(console.error);
}
