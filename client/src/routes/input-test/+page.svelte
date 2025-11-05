<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  
  let pressedKeys = new Set<string>();
  let lastKeyPressed = 'none';
  let spacePressed = false;
  let shiftPressed = false;
  let logMessages: string[] = [];
  
  function addLog(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    logMessages = [`[${timestamp}] ${message}`, ...logMessages].slice(0, 20);
  }
  
  function handleKeyDown(event: KeyboardEvent) {
    const key = event.key;
    const code = event.code;
    
    pressedKeys.add(code);
    lastKeyPressed = `${key} (${code})`;
    
    addLog(`⬇️ KeyDown: key="${key}", code="${code}", keyCode=${event.keyCode}`);
    
    if (key === ' ' || code === 'Space') {
      spacePressed = true;
      addLog('✅ SPACE DETECTED!');
    }
    
    if (key === 'Shift' || code === 'ShiftLeft' || code === 'ShiftRight') {
      shiftPressed = true;
      addLog('✅ SHIFT DETECTED!');
    }
    
    event.preventDefault();
  }
  
  function handleKeyUp(event: KeyboardEvent) {
    const key = event.key;
    const code = event.code;
    
    pressedKeys.delete(code);
    
    addLog(`⬆️ KeyUp: key="${key}", code="${code}"`);
    
    if (key === ' ' || code === 'Space') {
      spacePressed = false;
    }
    
    if (key === 'Shift' || code === 'ShiftLeft' || code === 'ShiftRight') {
      shiftPressed = false;
    }
  }
  
  onMount(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    addLog('🎮 Input test initialized - Press Space or Shift!');
  });
  
  onDestroy(() => {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);
  });
</script>

<div class="page-wrapper">
  <div class="page-header">
    <h1>Input Test</h1>
    <p>Test keyboard input detection and game controls</p>
  </div>

  <div class="container">
    <h2>🎮 Keyboard Input Test</h2>
  
  <div class="instructions">
    <h3>📋 Instructions:</h3>
    <ol>
      <li>This page is automatically focused</li>
      <li>Press <strong>SPACE</strong> or <strong>SHIFT</strong></li>
      <li>Watch the status boxes below</li>
    </ol>
  </div>

  <div class="status-grid">
    <div class="status-box" class:active={spacePressed}>
      <div class="status-label">Space Key</div>
      <div class="status-value">
        {spacePressed ? '✅ PRESSED' : '⬜ Not Pressed'}
      </div>
    </div>
    
    <div class="status-box" class:active={shiftPressed}>
      <div class="status-label">Shift Key</div>
      <div class="status-value">
        {shiftPressed ? '✅ PRESSED' : '⬜ Not Pressed'}
      </div>
    </div>
    
    <div class="status-box">
      <div class="status-label">Last Key</div>
      <div class="status-value">{lastKeyPressed}</div>
    </div>
    
    <div class="status-box">
      <div class="status-label">Active Keys</div>
      <div class="status-value">{pressedKeys.size}</div>
    </div>
  </div>

  <div class="log-container">
    <h3>📊 Event Log:</h3>
    <div class="log">
      {#each logMessages as message}
        <div class="log-entry">{message}</div>
      {/each}
    </div>
  </div>
  
  <div class="back-link">
    <a href="/game">← Back to Game</a>
  </div>
  </div>
</div>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 40px 20px;
    font-family: Arial, sans-serif;
    background: #1a1a1a;
    min-height: 100vh;
    color: #fff;
  }

  h1 {
    text-align: center;
    color: #4a90e2;
    margin-bottom: 30px;
  }

  .instructions {
    background: #2a2a2a;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 30px;
    border: 2px solid #4a90e2;
  }

  .instructions h3 {
    color: #ffa500;
    margin-top: 0;
  }

  .instructions ol {
    margin: 10px 0;
    padding-left: 25px;
  }

  .instructions li {
    margin: 8px 0;
    line-height: 1.6;
  }

  .status-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
  }

  .status-box {
    background: #2a2a2a;
    border: 3px solid #555;
    border-radius: 8px;
    padding: 20px;
    text-align: center;
    transition: all 0.2s;
  }

  .status-box.active {
    background: #4ecdc4;
    border-color: #4ecdc4;
    transform: scale(1.05);
    box-shadow: 0 0 20px rgba(78, 205, 196, 0.5);
  }

  .status-box.active .status-label,
  .status-box.active .status-value {
    color: #000;
    font-weight: bold;
  }

  .status-label {
    font-size: 14px;
    color: #888;
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .status-value {
    font-size: 24px;
    font-weight: bold;
    color: #fff;
  }

  .log-container {
    background: #2a2a2a;
    border: 2px solid #4a90e2;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 30px;
  }

  .log-container h3 {
    margin-top: 0;
    color: #4a90e2;
  }

  .log {
    background: #000;
    border-radius: 4px;
    padding: 15px;
    max-height: 400px;
    overflow-y: auto;
    font-family: 'Courier New', monospace;
    font-size: 13px;
  }

  .log-entry {
    margin: 5px 0;
    padding: 5px;
    border-bottom: 1px solid #333;
  }

  .log-entry:last-child {
    border-bottom: none;
  }

  .back-link {
    text-align: center;
  }

  .back-link a {
    color: #4a90e2;
    text-decoration: none;
    font-size: 18px;
    padding: 10px 20px;
    border: 2px solid #4a90e2;
    border-radius: 5px;
    display: inline-block;
    transition: all 0.3s;
  }

  .back-link a:hover {
    background: #4a90e2;
    color: #fff;
  }

  /* Page Header */
  .page-wrapper {
    min-height: 100vh;
    background: linear-gradient(135deg, #0a0e1a 0%, #1a1f2e 100%);
    color: #ffffff;
    font-family: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .page-header {
    text-align: center;
    padding: 2rem 1rem;
    max-width: 800px;
    margin: 0 auto;
  }

  .page-header h1 {
    margin: 0 0 0.5rem 0;
    font-size: 2rem;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: -0.02em;
  }

  .page-header p {
    margin: 0;
    font-size: 1rem;
    color: #a0a0a0;
    line-height: 1.5;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .page-header {
      padding: 1.5rem 1rem;
    }

    .page-header h1 {
      font-size: 1.75rem;
    }

    .page-header p {
      font-size: 0.9rem;
    }
  }

  @media (max-width: 480px) {
    .page-header {
      padding: 1.25rem 0.875rem;
    }

    .page-header h1 {
      font-size: 1.5rem;
    }

    .page-header p {
      font-size: 0.875rem;
    }
  }
</style>

