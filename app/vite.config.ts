import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The web client lives in ./web and builds to ./web-dist, which the Fastify
// server serves as static assets. During development, Vite proxies /api to the
// local server so nothing ever leaves the machine.
export default defineConfig({
  root: 'web',
  plugins: [react()],
  build: {
    outDir: '../web-dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
});
