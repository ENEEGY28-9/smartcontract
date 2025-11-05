// Simple WebSocket server for particle spawning testing
// This simulates the backend that would normally be connected to blockchain

import WebSocket from 'ws';
import { createServer } from 'http';

const server = createServer();
const wss = new WebSocket.Server({ server });

// Handle different WebSocket paths
server.on('upgrade', (request, socket, head) => {
  const pathname = request.url;

  if (pathname === '/particle-spawn') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

server.listen(8080, () => {
  console.log('🚀 Particle spawning WebSocket server started on port 8080');
  console.log('WebSocket endpoint: ws://localhost:8080/particle-spawn');
});

console.log('🚀 Particle spawning WebSocket server started on port 8080');
console.log('Waiting for game client connection...');

// Store connected clients
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('🔗 Game client connected');
  clients.add(ws);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'Connected to particle spawning server'
  }));

  // Handle client messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('📨 Received from client:', data);

      // Echo back for testing
      ws.send(JSON.stringify({
        type: 'echo',
        received: data
      }));

    } catch (error) {
      console.error('❌ Failed to parse client message:', error);
    }
  });

  ws.on('close', () => {
    console.log('🔌 Game client disconnected');
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

// Spawn particles every 3 seconds
setInterval(spawnTestParticles, 3000);

console.log('🔄 Auto-particle spawning enabled (every 3 seconds)');
console.log('Run: node test_particle_spawning.js to send manual test events');
console.log('Open game at http://localhost:5173/ to see particles');
