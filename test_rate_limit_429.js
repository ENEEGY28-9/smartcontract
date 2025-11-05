const WebSocket = require('ws');

// Test script để đo tỷ lệ lỗi 429
async function testRateLimit429() {
    const totalRequests = 1000;
    const concurrentClients = 10;
    let successCount = 0;
    let error429Count = 0;
    let otherErrorCount = 0;

    console.log(`🚀 Starting rate limit test: ${totalRequests} requests, ${concurrentClients} concurrent clients`);

    const clients = [];

    // Tạo các client
    for (let i = 0; i < concurrentClients; i++) {
        clients.push(new WebSocket('ws://localhost:8080/ws'));
    }

    // Đợi các client kết nối
    await new Promise(resolve => {
        let connected = 0;
        clients.forEach(client => {
            client.on('open', () => {
                connected++;
                if (connected === concurrentClients) {
                    resolve();
                }
            });

            client.on('error', (error) => {
                console.error('Client connection error:', error.message);
                otherErrorCount++;
            });
        });
    });

    console.log('✅ All clients connected');

    // Gửi requests và đo kết quả
    const promises = [];
    for (let i = 0; i < totalRequests; i++) {
        const clientIndex = i % concurrentClients;
        const client = clients[clientIndex];

        promises.push(new Promise((resolve) => {
            // Gửi một số message để trigger rate limiting
            const message = JSON.stringify({
                type: 'test_message',
                data: `Test message ${i}`,
                timestamp: Date.now()
            });

            client.send(message);

            // Đếm response
            const timeout = setTimeout(() => {
                otherErrorCount++;
                resolve();
            }, 1000);

            client.once('message', (data) => {
                clearTimeout(timeout);
                const response = JSON.parse(data.toString());

                if (response.error && response.error.includes('429')) {
                    error429Count++;
                } else {
                    successCount++;
                }
                resolve();
            });

            client.once('error', (error) => {
                clearTimeout(timeout);
                if (error.message.includes('429')) {
                    error429Count++;
                } else {
                    otherErrorCount++;
                }
                resolve();
            });
        }));

        // Thêm delay nhỏ để tránh quá tải
        await new Promise(resolve => setTimeout(resolve, 10));
    }

    await Promise.all(promises);

    // Đóng các client
    clients.forEach(client => client.close());

    // Tính toán kết quả
    const totalResponses = successCount + error429Count + otherErrorCount;
    const error429Rate = totalResponses > 0 ? (error429Count / totalResponses) * 100 : 0;

    console.log('\n📊 RATE LIMIT TEST RESULTS');
    console.log('========================');
    console.log(`Total Requests: ${totalRequests}`);
    console.log(`Successful Responses: ${successCount}`);
    console.log(`429 Errors: ${error429Count}`);
    console.log(`Other Errors: ${otherErrorCount}`);
    console.log(`Error 429 Rate: ${error429Rate.toFixed(2)}%`);

    if (error429Rate < 5) {
        console.log('✅ TARGET ACHIEVED: Error 429 rate < 5%');
    } else if (error429Rate < 20) {
        console.log('⚠️  PARTIALLY ACHIEVED: Error 429 rate reduced but still > 5%');
    } else {
        console.log('❌ TARGET NOT ACHIEVED: Error 429 rate still high (> 20%)');
    }

    return {
        successCount,
        error429Count,
        otherErrorCount,
        error429Rate,
        targetAchieved: error429Rate < 5
    };
}

// Chạy test
testRateLimit429().catch(console.error);
