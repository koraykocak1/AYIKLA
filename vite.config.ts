import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Geliştirme sunucusunda Vite'ın kendi satır içi betikleri çalışabilsin diye güvenlik kuralı (CSP) çıkarılır.
// Yalnızca `vite` geliştirme sunucusunda; paketlenen programda kural aynen kalır.
const gelistirmeCsp: Plugin = {
  name: 'gelistirme-csp',
  apply: 'serve',
  transformIndexHtml: (html) => html.replace(/<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?\/>/, ''),
};

export default defineConfig({
  root: 'src/arayuz',
  base: './',
  plugins: [react(), gelistirmeCsp],
  build: { outDir: '../../dist/arayuz', emptyOutDir: true, chunkSizeWarningLimit: 2000 },
});
