import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const extraHosts = (process.env.DEV_EXTRA_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
  .flatMap((origin) => {
    try {
      return [new URL(origin).hostname];
    } catch {
      return [];
    }
  });

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: extraHosts,
    watch: {
      usePolling: process.env.VITE_USE_POLLING === 'true',
    },
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://localhost:8787',
        changeOrigin: false,
      },
    },
  },
});
