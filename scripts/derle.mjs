import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { build as viteBuild } from 'vite';

const kok = resolve(import.meta.dirname, '..');
process.chdir(kok);
rmSync('dist', { recursive: true, force: true });

const ortak = { bundle: true, platform: 'node', target: 'node22', logLevel: 'warning' };
// Yerel (native) ve büyük paketler dışarıda kalır; node_modules'tan yüklenir.
const DISARIDA = ['electron', 'sharp', 'better-sqlite3', '@huggingface/transformers', 'onnxruntime-node', 'ffmpeg-static', 'heic-convert', 'exifr'];

await build({ ...ortak, entryPoints: ['src/ana/ana.ts'], outfile: 'dist/ana.cjs', format: 'cjs', external: ['electron', 'electron-updater'] });
await build({ ...ortak, entryPoints: ['src/ana/onyukle.ts'], outfile: 'dist/onyukle.cjs', format: 'cjs', external: ['electron'] });
await build({ ...ortak, entryPoints: ['src/isci-giris.ts'], outfile: 'dist/isci.mjs', format: 'esm', external: DISARIDA });
await viteBuild({ configFile: resolve(kok, 'vite.config.ts'), logLevel: 'warn' });
console.log('Derlendi: dist/');
