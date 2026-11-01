import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { writeFile, stat } from 'node:fs/promises';
import { tarihDosyaAdindan, tarihBul } from '../src/motor/tarih';
import { geciciKlasor, exifliResim, ornekVideo } from './yardimci';

const yerel = (y: number, ay: number, g: number, s = 0, d = 0, sn = 0) => new Date(y, ay - 1, g, s, d, sn);

describe('tarihDosyaAdindan', () => {
  it.each([
    ['IMG_20240812_153000.jpg', yerel(2024, 8, 12, 15, 30, 0)],
    ['PXL_20231101_101112345.jpg', yerel(2023, 11, 1, 10, 11, 12)],
    ['Screenshot_20220304-050607.png', yerel(2022, 3, 4, 5, 6, 7)],
    ['WhatsApp Image 2024-08-12 at 15.30.00.jpeg', yerel(2024, 8, 12, 15, 30, 0)],
    ['IMG-20210102-WA0001.jpg', yerel(2021, 1, 2)],
    ['tatil 2019-07-15.jpg', yerel(2019, 7, 15)],
  ])('%s', (ad, beklenen) => {
    expect(tarihDosyaAdindan(ad)?.getTime()).toBe(beklenen.getTime());
  });

  it('geçersiz tarihleri reddeder', () => {
    expect(tarihDosyaAdindan('IMG_20241399_000000.jpg')).toBeNull();
    expect(tarihDosyaAdindan('foto.jpg')).toBeNull();
    expect(tarihDosyaAdindan('12345678.jpg')).toBeNull();
  });
});

describe('tarihBul', () => {
  it('EXIF tarihini kullanır', async () => {
    const k = await geciciKlasor();
    const f = join(k, 'IMG_20200101_000000.jpg');
    await exifliResim(f, '2023:07:01 10:20:30');
    const s = await stat(f);
    const t = await tarihBul({ yol: f, tur: 'foto', boyut: s.size, degisme: s.mtimeMs });
    expect(t.kaynak).toBe('exif');
    expect(t.tarih.getTime()).toBe(yerel(2023, 7, 1, 10, 20, 30).getTime());
    expect(t.tahmini).toBe(false);
  });

  it('video oluşturma tarihini kullanır', async () => {
    const k = await geciciKlasor();
    const v = join(k, 'v.mp4');
    await ornekVideo(v, 'red', '2022-05-06T07:08:09Z');
    const s = await stat(v);
    const t = await tarihBul({ yol: v, tur: 'video', boyut: s.size, degisme: s.mtimeMs });
    expect(t.kaynak).toBe('video');
    expect(t.tarih.toISOString()).toBe('2022-05-06T07:08:09.000Z');
  });

  it('Google Takeout json dosyasını kullanır', async () => {
    const k = await geciciKlasor();
    const f = join(k, 'a.jpg');
    await writeFile(f, 'bozuk-jpeg');
    await writeFile(f + '.supplemental-metadata.json', JSON.stringify({ photoTakenTime: { timestamp: '1600000000' } }));
    const s = await stat(f);
    const t = await tarihBul({ yol: f, tur: 'foto', boyut: s.size, degisme: s.mtimeMs });
    expect(t.kaynak).toBe('takeout');
    expect(t.tarih.getTime()).toBe(1600000000 * 1000);
  });

  it('dosya adına, en son dosya tarihine düşer', async () => {
    const k = await geciciKlasor();
    const a = join(k, 'IMG_20240812_153000.jpg');
    await writeFile(a, 'x');
    const sa = await stat(a);
    expect((await tarihBul({ yol: a, tur: 'foto', boyut: 1, degisme: sa.mtimeMs })).kaynak).toBe('dosya-adi');

    const b = join(k, 'isimsiz.jpg');
    await writeFile(b, 'x');
    const sb = await stat(b);
    const t = await tarihBul({ yol: b, tur: 'foto', boyut: 1, degisme: sb.mtimeMs });
    expect(t.kaynak).toBe('dosya-tarihi');
    expect(t.tahmini).toBe(true);
  });
});
