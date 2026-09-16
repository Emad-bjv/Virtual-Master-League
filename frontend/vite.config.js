import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://37.32.36.252',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://37.32.36.252',
        ws: true,
        changeOrigin: true,
      },
      '/media': {
        target: 'http://37.32.36.252',
        changeOrigin: true,
      },
    },
    watch: {
      ignored: ['**/public/images/**', '**/public/assets/**'],
    },
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1200,
    modulePreload: {
      polyfill: false,
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@sentry')) {
              return 'vendor-sentry';
            }
            if (id.includes('@dnd-kit')) {
              return 'vendor-dnd';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-motion';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('react-router-dom') || id.includes('react-dom') || id.includes('react/') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            return 'vendor-core';
          }
        },
      },
    },
  },
});
