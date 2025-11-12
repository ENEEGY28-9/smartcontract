const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 8080;

// Enable CORS for all routes
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Parse JSON bodies
app.use(express.json());

// Mock Solana wallet generation endpoint
app.post('/api/wallet/generate-solana', (req, res) => {
  console.log('🔄 Received wallet generation request');

  // Check for authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ No valid auth token');
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  // Mock wallet generation (simulating real Ed25519)
  const mockAddress = '7xKXtg2CW87d97TXJSDpbJMWCfH' +
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);

  const mockPrivateKey = 'mock_private_key_' + Math.random().toString(36).substring(2, 20);

  console.log('✅ Generated mock wallet:', mockAddress.substring(0, 20) + '...');

  res.json({
    success: true,
    address: mockAddress,
    private_key: mockPrivateKey,
    public_key: mockAddress
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', cors: 'enabled' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 CORS Test Server running on http://localhost:${PORT}`);
  console.log(`📡 CORS enabled for: http://localhost:5173`);
  console.log(`🔗 Test endpoint: POST /api/wallet/generate-solana`);
  console.log(`❤️  Health check: GET /health`);
});

process.on('SIGINT', () => {
  console.log('👋 CORS Test Server stopped');
  process.exit(0);
});






