// Simple test server for Solana wallet generation
const http = require('http');

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  // Handle wallet generation endpoint
  if (req.method === 'POST' && req.url === '/api/wallet/generate-solana') {
    console.log('🔄 Received wallet generation request');

    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      // Skip authentication for wallet generation - now handled client-side
      console.log('🎯 Processing wallet claim request');

      // Optional: Log auth header if present
      const authHeader = req.headers.authorization;
      if (authHeader) {
        console.log('🔑 Token preview:', authHeader.substring(0, 50) + '...');
      }

      // Generate mock wallet (simulating real Ed25519)
      const timestamp = Date.now().toString(36);
      const random1 = Math.random().toString(36).substring(2, 10);
      const random2 = Math.random().toString(36).substring(2, 10);

      const mockAddress = '7xKXtg2CW87d97TXJSDpbJMWCfH' + random1 + random2 + timestamp;
      const mockPrivateKey = 'mock_private_key_' + Math.random().toString(36).substring(2, 20);

      console.log('✅ Generated mock wallet:', mockAddress.substring(0, 25) + '...');

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: true,
        address: mockAddress,
        private_key: mockPrivateKey,
        public_key: mockAddress
      }));
    });
    return;
  }

  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'OK', cors: 'enabled' }));
    return;
  }

  // 404 for other routes
  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Not found' }));
});

const PORT = 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Simple Test Server running on http://localhost:${PORT}`);
  console.log(`📡 CORS enabled for: http://localhost:5173`);
  console.log(`🔗 Test endpoint: POST /api/wallet/generate-solana`);
  console.log(`❤️  Health check: GET /health`);
  console.log(`\n💡 Ready to test wallet generation!`);
});

process.on('SIGINT', () => {
  console.log('\n👋 Simple Test Server stopped');
  server.close();
  process.exit(0);
});
