import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'src/arayuz',
  base: './',
  plugins: [react()],
  build: { outDir: '../../dist/arayuz', emptyOutDir: true, chunkSizeWarningLimit: 2000 },
});
