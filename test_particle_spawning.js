// Test script for particle spawning system
// Run this to test particle spawning in the Infinite Runner game

import WebSocket from 'ws';

// Connect to the particle spawning WebSocket
const ws = new WebSocket('ws://localhost:8080/particle-spawn');

ws.on('open', () => {
  console.log('🔗 Connected to particle spawning WebSocket');

  // Test 1: Spawn a small particle
  setTimeout(() => {
    const particleData = {
      type: 'particle_spawn',
      x: 5.0,
      z: -10.0,
      type: 'small',
      particleId: 'test-particle-1'
    };

    ws.send(JSON.stringify(particleData));
    console.log('⚡ Sent particle spawn event:', particleData);
  }, 2000);

  // Test 2: Spawn a medium particle
  setTimeout(() => {
    const particleData = {
      type: 'particle_spawn',
      x: -3.0,
      z: -15.0,
      type: 'medium',
      particleId: 'test-particle-2'
    };

    ws.send(JSON.stringify(particleData));
    console.log('⚡ Sent particle spawn event:', particleData);
  }, 4000);

  // Test 3: Spawn a large particle
  setTimeout(() => {
    const particleData = {
      type: 'particle_spawn',
      x: 0.0,
      z: -20.0,
      type: 'large',
      particleId: 'test-particle-3'
    };

    ws.send(JSON.stringify(particleData));
    console.log('⚡ Sent particle spawn event:', particleData);
  }, 6000);

  // Test 4: Simulate token minting event
  setTimeout(() => {
    const mintData = {
      type: 'token_minted',
      player: 'test-player',
      game_amount: 1,
      owner_amount: 1,
      particle_location: [5.0, -10.0],
      session_tokens: 5
    };

    ws.send(JSON.stringify(mintData));
    console.log('🎉 Sent token minted event:', mintData);
  }, 8000);

  // Close connection after tests
  setTimeout(() => {
    ws.close();
    console.log('🔌 Closed WebSocket connection');
  }, 10000);
});

ws.on('message', (data) => {
  console.log('📨 Received:', data.toString());
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});

ws.on('close', () => {
  console.log('🔌 WebSocket closed');
});

console.log('🚀 Starting particle spawning tests...');
console.log('Make sure the game is running at http://localhost:5173/');
console.log('Particles should spawn in the game world after a few seconds.');
