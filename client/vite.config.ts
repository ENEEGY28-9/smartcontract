import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  plugins: [sveltekit(), wasm()],
  define: {
    'global': 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer/',
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: false,
    https: false, // Có thể bật nếu cần HTTPS cho WebRTC
    cors: {
      origin: [
        'chrome-extension://bfnaelmomeimhlpmgjnjophhpkkoljpa',
        'chrome-extension://*',
        'https://phantom.app',
        'https://*.phantom.app',
        'https://solana.com',
        'https://*.solana.com',
        'http://localhost:*',
        'https://localhost:*',
        'http://127.0.0.1:*',
        'https://127.0.0.1:*'
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Install-Date',
        'Origin',
        'Accept',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers'
      ]
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Install-Date, Origin, Accept, Access-Control-Request-Method, Access-Control-Request-Headers',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
      // Security headers for wallet compatibility
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      // 'Cross-Origin-Embedder-Policy': 'require-corp',
      // 'Cross-Origin-Opener-Policy': 'same-origin'
    },
    proxy: {
      '/auth': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('Gateway proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Sending Request to Gateway:', req.method, req.url, '->', proxyReq.getHeader('host') + proxyReq.path);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Received Response from Gateway:', proxyRes.statusCode, req.url);
          });
        }
      },
      '/inputs': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/ws': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        ws: true
      },
      '/rtc': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/healthz': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/version': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/metrics': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      // PocketBase proxy configuration
      '/pb-api': {
        target: 'http://127.0.0.1:8090',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => {
          const newPath = path.replace(/^\/pb-api/, '');
          console.log('Proxy rewrite:', path, '->', newPath);
          return newPath;
        },
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('PocketBase proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Sending Request to PocketBase:', req.method, req.url, '->', proxyReq.getHeader('host') + proxyReq.path);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Received Response from PocketBase:', proxyRes.statusCode, req.url);
          });
        }
      }
    }
  },
  optimizeDeps: {
    include: ['svelte', '@sveltejs/kit', '@dimforge/rapier3d', 'three', 'buffer'],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  },
  build: {
    sourcemap: true
  }
});
