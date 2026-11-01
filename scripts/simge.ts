import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { icoYap } from '../src/ana/ico';

const kok = resolve(import.meta.dirname, '..');
// Koyu zemin, altın çerçeve, dağınık kartların üstünde altın bir "A".
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3dcaa"/><stop offset="1" stop-color="#c9a764"/></linearGradient></defs>
  <rect x="8" y="8" width="240" height="240" rx="56" fill="#0b0a09"/>
  <rect x="14" y="14" width="228" height="228" rx="50" fill="none" stroke="#e8c98a" stroke-opacity="0.45" stroke-width="3"/>
  <rect x="58" y="132" width="62" height="46" rx="6" fill="#2a241b" transform="rotate(-14 89 155)"/>
  <rect x="138" y="138" width="62" height="46" rx="6" fill="#3a3123" transform="rotate(11 169 161)"/>
  <path fill="url(#g)" fill-rule="evenodd" d="M128 46 L200 210 L170 210 L155 172 L101 172 L86 210 L56 210 Z M128 96 L111 146 L145 146 Z"/>
</svg>`;

mkdirSync(resolve(kok, 'simge'), { recursive: true });
const png = await sharp(Buffer.from(svg)).png().toBuffer();
writeFileSync(resolve(kok, 'simge', 'ayikla.png'), png);
writeFileSync(resolve(kok, 'simge', 'ayikla.ico'), icoYap(png, 256));
console.log('simge/ayikla.png ve simge/ayikla.ico üretildi');
