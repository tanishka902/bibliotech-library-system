import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// During development the browser talks to Vite (same origin), and Vite forwards
// everything under /gateway/* to your API Gateway on port 8080. Because the browser
// never makes a cross-origin request, no CORS setup is needed in this mode.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.GATEWAY_URL || 'http://localhost:8080';

  const proxy = {
    '/gateway': {
      target,
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/gateway/, ''),
      configure: (p) => {
        // Strip the Origin header so Spring does not treat the proxied call as a
        // cross-origin request (which would be rejected if CORS is not configured).
        p.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'));
      },
    },
  };

  return {
    plugins: [react()],
    server: { port: 5173, proxy },
    preview: { port: 4173, proxy },
  };
});
