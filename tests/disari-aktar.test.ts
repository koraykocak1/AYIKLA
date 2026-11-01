import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { hedefKlasor, guvenliAd, disariAktar } from '../src/motor/disari-aktar';
import { geciciKlasor } from './yardimci';

describe('disari-aktar', () => {
  it('Grup/Yıl/Ay klasörünü üretir', () => {
    const t = new Date(2024, 7, 12).toISOString();
    expect(hedefKlasor('C:/H', 'Deniz / Plaj', t)).toBe(join('C:/H', 'Deniz - Plaj', '2024', '08-Ağustos'));
  });

  it('Windows’ta yasak karakterleri temizler', () => {
    expect(guvenliAd('a<b>c:d"e/f\\g|h?i*j')).toBe('a-b-c-d-e-f-g-h-i-j');
  });

  it('kopyalar, orijinali bırakır; aynı dosyayı ikinci kez kopyalamaz; ad çakışmasında numara ekler', async () => {
    const k = await geciciKlasor();
    await mkdir(join(k, 'a'));
    await mkdir(join(k, 'b'));
    const kaynak1 = join(k, 'a', 'foto.jpg');
    const kaynak2 = join(k, 'b', 'foto.jpg');
    await writeFile(kaynak1, 'bir');
    await writeFile(kaynak2, 'ikiii');
    const tarih = new Date(2024, 7, 12).toISOString();
    const hedef = join(k, 'H');
    const ogeler = [
      { yol: kaynak1, grupAdi: 'Deniz', tarih },
      { yol: kaynak2, grupAdi: 'Deniz', tarih },
    ];

    const r1 = await disariAktar(ogeler, hedef);
    expect(r1).toEqual({ kopyalanan: 2, atlanan: 0, hatalar: [] });
    const klasor = join(hedef, 'Deniz', '2024', '08-Ağustos');
    expect((await readdir(klasor)).sort()).toEqual(['foto (2).jpg', 'foto.jpg']);
    expect(await readFile(kaynak1, 'utf8')).toBe('bir');

    const r2 = await disariAktar(ogeler, hedef);
    expect(r2).toEqual({ kopyalanan: 0, atlanan: 2, hatalar: [] });
  });
});
