// Simple WebSocket server for testing particle spawning
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

console.log('🚀 Simple WebSocket server started on port 8080');
console.log('Listening for connections...');

// Store connected clients
const clients = new Set();

wss.on('connection', (ws, request) => {
  console.log('🔗 Client connected from:', request.socket.remoteAddress);

  clients.add(ws);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'Connected to particle spawning server'
  }));

  ws.on('message', (message) => {
    console.log('📨 Received:', message.toString());
  });

  ws.on('close', () => {
    console.log('🔌 Client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
    clients.delete(ws);
  });
});

// Auto-spawn particles for testing
let particleCounter = 0;

function spawnTestParticles() {
  if (clients.size === 0) return;

  particleCounter++;

  // Spawn particle at random position in front of player
  const x = (Math.random() - 0.5) * 10; // -5 to 5
  const z = -10 - Math.random() * 20; // -10 to -30
  const types = ['small', 'medium', 'large'];
  const type = types[Math.floor(Math.random() * types.length)];

  const particleData = {
    type: 'particle_spawn',
    x: x,
    z: z,
    type: type,
    particleId: `auto-particle-${particleCounter}`
  };

  // Send to all connected clients
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(particleData));
    }
  });

  console.log(`⚡ Auto-spawned particle: ${type} at (${x.toFixed(1)}, ${z.toFixed(1)})`);
}

// Spawn particles every 5 seconds
setInterval(spawnTestParticles, 5000);

console.log('🔄 Auto-particle spawning enabled (every 5 seconds)');

