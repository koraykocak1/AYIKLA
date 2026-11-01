import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { fotoOnizleme, ONIZLEME_BOYUT } from '../src/motor/onizleme';
import { geciciKlasor, desenliResim } from './yardimci';

describe('onizleme', () => {
  it('küçük resim üretir, orijinal boyutu döndürür', async () => {
    const k = await geciciKlasor();
    const kaynak = join(k, 'b.jpg');
    await desenliResim(kaynak, { renk: [100, 150, 200], tohum: 1, boyut: 1000 });
    const hedef = join(k, 'o.jpg');
    const b = await fotoOnizleme(kaynak, hedef);
    expect(b).toEqual({ genislik: 1000, yukseklik: 1000 });
    expect((await sharp(hedef).metadata()).width).toBe(ONIZLEME_BOYUT);
  });

  it('bozuk dosyada hata fırlatır', async () => {
    const k = await geciciKlasor();
    const kaynak = join(k, 'bozuk.jpg');
    await writeFile(kaynak, 'degil');
    await expect(fotoOnizleme(kaynak, join(k, 'o.jpg'))).rejects.toThrow();
  });
});
