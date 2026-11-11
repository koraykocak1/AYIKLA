import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

/**
 * Program simgesini üretir: `simge/ayikla-512.png` (köşeleri saydam ana görsel) →
 * `simge/ayikla.png` (256) ve çok boyutlu `simge/ayikla.ico` (16–256; Windows her yerde uygun boyutu seçer).
 * Ana görsel `simge/ayikla-kaynak.png`'den kırpıldı (Higgsfield / GPT Image ile üretildi, 2026-11-11).
 */
const kok = resolve(import.meta.dirname, '..');
const ana = readFileSync(resolve(kok, 'simge', 'ayikla-512.png'));
const BOYUTLAR = [16, 24, 32, 48, 64, 128, 256];

const resimler = await Promise.all(BOYUTLAR.map((b) => sharp(ana).resize(b, b).png().toBuffer()));

// ICO: 6 baytlık başlık + her resim için 16 baytlık kayıt + PNG verileri
const bas = Buffer.alloc(6 + 16 * resimler.length);
bas.writeUInt16LE(0, 0);
bas.writeUInt16LE(1, 2);
bas.writeUInt16LE(resimler.length, 4);
let konum = bas.length;
resimler.forEach((png, i) => {
  const k = 6 + 16 * i;
  const b = BOYUTLAR[i];
  bas.writeUInt8(b >= 256 ? 0 : b, k);
  bas.writeUInt8(b >= 256 ? 0 : b, k + 1);
  bas.writeUInt16LE(1, k + 4);
  bas.writeUInt16LE(32, k + 6);
  bas.writeUInt32LE(png.length, k + 8);
  bas.writeUInt32LE(konum, k + 12);
  konum += png.length;
});

writeFileSync(resolve(kok, 'simge', 'ayikla.png'), resimler[BOYUTLAR.indexOf(256)]);
writeFileSync(resolve(kok, 'simge', 'ayikla.ico'), Buffer.concat([bas, ...resimler]));
console.log('simge/ayikla.png ve simge/ayikla.ico üretildi');
