import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@copia/types': path.resolve(__dirname, '../types/src'),
      '@copia/rule-engine': path.resolve(__dirname, '../rule-engine/src'),
      '@copia/data-service': path.resolve(__dirname, '../data-service/src'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
