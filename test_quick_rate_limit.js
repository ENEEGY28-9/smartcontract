#!/usr/bin/env node

// Quick test to check if rate limiting is working
const http = require('http');

async function quickTest() {
    console.log('🚀 Quick Rate Limiting Test');
    console.log('==========================\n');

    let rateLimited = 0;
    let success = 0;
    let errors = 0;

    console.log('📤 Sending 10 rapid requests...\n');

    for (let i = 1; i <= 10; i++) {
        await new Promise((resolve) => {
            const testData = JSON.stringify({
                name: `Quick Test ${i}`,
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
                    'User-Agent': `QuickTest/${i}`,
                    'X-Forwarded-For': `192.168.1.${200 + i}`, // Same IP range
                    'X-Client-ID': 'quick_test' // Same client
                },
                timeout: 3000
            };

            const req = http.request(options, (res) => {
                if (res.statusCode === 429) {
                    rateLimited++;
                    console.log(`🚫 ${i}: Rate limited (429)`);
                } else if (res.statusCode === 404) {
                    success++;
                    console.log(`✅ ${i}: Success (404)`);
                } else {
                    errors++;
                    console.log(`❌ ${i}: Error (${res.statusCode})`);
                }

                res.on('data', () => {});
                res.on('end', () => resolve());
            });

            req.on('error', () => {
                errors++;
                console.log(`🔥 ${i}: Connection error`);
                resolve();
            });

            req.on('timeout', () => {
                errors++;
                console.log(`⏰ ${i}: Timeout`);
                req.destroy();
                resolve();
            });

            req.write(testData);
            req.end();
        });

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('\n🎯 RESULTS');
    console.log('=========');
    console.log(`📊 Total: 10 requests`);
    console.log(`✅ Success/404: ${success}`);
    console.log(`🚫 Rate Limited: ${rateLimited}`);
    console.log(`❌ Errors: ${errors}`);

    if (rateLimited > 0) {
        console.log('\n🎉 RATE LIMITING IS WORKING!');
        console.log(`   Successfully blocked ${rateLimited} requests with 429`);
        console.log(`   Rate limit percentage: ${((rateLimited/10)*100).toFixed(1)}%`);

        if (rateLimited/10 < 0.05) {
            console.log('✅ TARGET ACHIEVED: <5% rate limit errors');
        } else {
            console.log('📈 Rate limiting active but above 5%');
        }
    } else {
        console.log('\n⚠️  No rate limiting detected');
        console.log('   This could mean:');
        console.log('   - Rate limits are too high');
        console.log('   - API endpoint not implemented');
        console.log('   - Rate limiting not active for this endpoint');
    }

    // Check if gateway is running
    console.log('\n🔍 Gateway Status:');
    try {
        await new Promise((resolve, reject) => {
            const testData = JSON.stringify({ name: "Status", maxPlayers: 2, gameMode: "test", hostName: "Test" });

            const options = {
                hostname: 'localhost',
                port: 8080,
                path: '/api/rooms/create',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(testData)
                },
                timeout: 2000
            };

            const req = http.request(options, (res) => {
                if (res.statusCode) {
                    console.log('   ✅ Gateway is running and responding');
                    console.log(`   📊 Status Code: ${res.statusCode}`);
                    resolve();
                } else {
                    reject();
                }
            });

            req.on('error', () => {
                console.log('   ❌ Gateway is not responding');
                reject();
            });

            req.write(testData);
            req.end();
        });
    } catch (err) {
        console.log('   ❌ Cannot connect to gateway');
        console.log('   💡 Make sure gateway is running: cd gateway && cargo run');
    }
}

quickTest().catch(console.error);
