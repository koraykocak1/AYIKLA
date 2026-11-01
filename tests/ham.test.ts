import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { hamMi, hamOnizlemeOku } from '../src/motor/ham';
import { fotoOnizleme } from '../src/motor/onizleme';
import { geciciKlasor, gurultuJpeg, sahteNef } from './yardimci';

describe('ham (NEF)', () => {
  it('NEF uzantısını tanır', () => {
    expect(hamMi('C:/a/_DSC1.NEF')).toBe(true);
    expect(hamMi('C:/a/_DSC1.jpg')).toBe(false);
  });

  it('gömülü önizlemelerden işe yarayan en küçüğünü seçer; yön ve ham boyutu okur', async () => {
    const k = await geciciKlasor();
    const f = join(k, 'a.NEF');
    await sahteNef(f, { jpegler: [await gurultuJpeg(200, 150), await gurultuJpeg(1600, 1200), await gurultuJpeg(800, 600)], yon: 8, genislik: 8288, yukseklik: 5520 });
    const h = await hamOnizlemeOku(f);
    expect((await sharp(h.jpeg).metadata()).width).toBe(800);
    expect(h.yon).toBe(8);
    expect([h.genislik, h.yukseklik]).toEqual([8288, 5520]);
  });

  it('TIFF olmayan dosyada anlaşılır hata verir', async () => {
    const k = await geciciKlasor();
    const f = join(k, 'bozuk.NEF');
    await writeFile(f, 'degil');
    await expect(hamOnizlemeOku(f)).rejects.toThrow(/RAW/);
  });

  it('NEF’ten küçük resim üretir, dikey çekimi döndürür ve gerçek boyutu verir', async () => {
    const k = await geciciKlasor();
    const f = join(k, 'dik.nef');
    await sahteNef(f, { jpegler: [await gurultuJpeg(800, 600)], yon: 6, genislik: 6000, yukseklik: 4000 });
    const hedef = join(k, 'o.jpg');
    expect(await fotoOnizleme(f, hedef)).toEqual({ genislik: 4000, yukseklik: 6000 });
    const m = await sharp(hedef).metadata();
    expect(m.height).toBeGreaterThan(m.width ?? 0);
  });
});
