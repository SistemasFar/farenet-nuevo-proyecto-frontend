import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const publicHmrHost = env.VITE_PUBLIC_HMR_HOST?.trim();
  const proxy = {
    '/api': {
      target: 'http://127.0.0.1:3000',
      changeOrigin: true,
    },
    '/socket.io': {
      target: 'http://127.0.0.1:3000',
      changeOrigin: true,
      ws: true,
    },
  };

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts: ['.trycloudflare.com'],
      hmr: publicHmrHost
        ? {
            protocol: 'wss',
            host: publicHmrHost,
            clientPort: 443,
          }
        : undefined,
      proxy,
    },
    preview: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      allowedHosts: ['.trycloudflare.com'],
      proxy,
    },
  };
});
