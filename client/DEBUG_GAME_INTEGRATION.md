# 🔧 Debug Game Integration Issues

## 🚨 Current Issues
Game không thể chơi được tại `http://localhost:5173/`

## 🔍 Quick Debug Steps

### 1. Check Dev Server
```bash
cd client
npm run dev
```
**Expected:** Server starts at http://localhost:5173

### 2. Open Browser & Check Console
- Open: http://localhost:5173
- Press F12 → Console tab
- Look for errors in red

### 3. Check for These Error Types

#### ❌ TokenService Not Found
```
Error: TokenService is not defined
```
**Fix:** Check if files exist:
```
✅ client/src/lib/services/tokenService.ts
✅ client/public/game_token/blockchain_integration.js
✅ client/public/game_token/mainnet_deployment_info.json
```

#### ❌ Blockchain Integration Failed
```
Error: BlockchainIntegration is not defined
```
**Fix:** Check browser network tab for failed JS loads

#### ❌ Svelte Component Errors
```
Error: Cannot resolve component
```
**Fix:** Check if InfiniteRunner.svelte exists and imports are correct

#### ❌ Canvas/WebGL Errors
```
Error: WebGL context lost
```
**Fix:** Update graphics drivers or use software rendering

### 4. Manual Testing Checklist

Open browser console and run:
```javascript
// Check if Svelte loaded
console.log('Svelte loaded:', typeof $$ !== 'undefined');

// Check if Three.js loaded
console.log('Three.js loaded:', typeof THREE !== 'undefined');

// Check token service
console.log('TokenService:', typeof TokenService !== 'undefined');

// Check blockchain integration
console.log('BlockchainIntegration:', typeof BlockchainIntegration !== 'undefined');

// Check game canvas
console.log('Canvas exists:', document.querySelector('canvas, #gameCanvas, .game-canvas') !== null);
```

### 5. File Structure Check

Verify these files exist:
```
client/
├── src/
│   ├── lib/
│   │   ├── services/
│   │   │   └── tokenService.ts ✅
│   │   └── game/
│   │       └── InfiniteRunner.svelte ✅
│   └── routes/
│       └── +page.svelte ✅
├── public/
│   └── game_token/
│       ├── blockchain_integration.js ✅
│       └── mainnet_deployment_info.json ✅
└── package.json ✅
```

### 6. Network Tab Check

In browser DevTools:
- Network tab → Refresh page
- Look for failed requests (red entries)
- Check if all JS files load (200 status)

### 7. Console Error Patterns

#### Pattern 1: Import Errors
```
Uncaught TypeError: Failed to resolve module specifier
```
**Cause:** Missing dependencies or wrong import paths

#### Pattern 2: CORS Errors
```
Access to XMLHttpRequest blocked by CORS policy
```
**Cause:** API calls blocked, need CORS headers

#### Pattern 3: WebSocket Errors
```
WebSocket connection failed
```
**Cause:** Backend server not running or wrong URL

#### Pattern 4: Component Mount Errors
```
Error: Component X could not be mounted
```
**Cause:** Missing Svelte components or wrong imports

### 8. Quick Fixes

#### Fix 1: Clear Cache & Restart
```bash
# Stop dev server (Ctrl+C)
# Clear cache
rm -rf node_modules/.vite
# Restart
npm run dev
```

#### Fix 2: Check Dependencies
```bash
npm install
npm update
```

#### Fix 3: Browser Cache
- Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
- Clear browser cache

#### Fix 4: Different Browser
Try Chrome/Firefox/Edge to rule out browser-specific issues

### 9. Advanced Debugging

#### Check Vite Config
```javascript
// client/vite.config.ts - should include:
export default defineConfig({
  plugins: [sveltekit()],
  server: {
    host: '0.0.0.0',
    port: 5173
  }
});
```

#### Check Svelte Config
```javascript
// client/svelte.config.js - should include:
export default {
  kit: {
    adapter: adapter()
  }
};
```

### 10. Integration-Specific Checks

#### Token Minting Test
```javascript
// In browser console, after game loads:
TokenService.mintTokenOnCollect([100, 200], 'energy_particle')
  .then(result => console.log('Mint result:', result))
  .catch(error => console.error('Mint error:', error));
```

#### Wallet Connection Test
```javascript
// Check if Phantom is available
console.log('Phantom available:', typeof window.solana !== 'undefined');
```

#### Blockchain Connection Test
```javascript
// Test Solana connection
const { Connection } = require('@solana/web3.js');
const connection = new Connection('https://api.devnet-beta.solana.com');
connection.getVersion().then(v => console.log('Solana version:', v));
```

### 11. Emergency Fixes

#### Option A: Disable Token Integration Temporarily
Comment out token-related code in InfiniteRunner.svelte to test basic game functionality

#### Option B: Use Demo Mode Only
Modify TokenService to always use demo mode for testing

#### Option C: Simplify Game
Remove complex features temporarily to isolate the issue

### 12. Success Indicators

When working correctly, you should see:
```
✅ Game loads without console errors
✅ Canvas appears with background
✅ Player character is visible
✅ Particles spawn and fall
✅ Token balance shows 0
✅ Connect Wallet button works
✅ No red errors in console
✅ Network tab shows all files load (200)
```

### 13. Get Help

If still not working:
1. **Screenshot console errors**
2. **Check network tab for failed requests**
3. **List all files in client/ directory**
4. **Share package.json dependencies**

**Most common issues:**
- Missing dependencies
- Wrong import paths
- CORS policy blocks
- Browser cache issues
- Dev server not running

**Quick test:** Try opening `game_ui.html` directly in browser (not through dev server) to test basic functionality.

