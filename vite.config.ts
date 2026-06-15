import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: 'src/renderer',
  base: './',
  plugins: [react()],
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
    rollupOptions: {
      // tesseract.js usa workers dinámicos; excluirlo del bundle evita que Vite
      // rompa sus referencias internas a WASM y worker scripts
      external: [],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src/renderer') },
  },
  optimizeDeps: {
    exclude: ['tesseract.js'],
  },
  server: { port: 5173 },
});
