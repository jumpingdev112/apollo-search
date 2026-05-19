import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apolloKey = env.VITE_APOLLO_API_KEY || '';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3010,
      proxy: {
        // Dev proxy avoids browser CORS; API key is added server-side from .env
        '/apollo-proxy': {
          target: 'https://api.apollo.io',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/apollo-proxy/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (apolloKey) proxyReq.setHeader('x-api-key', apolloKey);
            });
          },
        },
      },
    },
  };
});
