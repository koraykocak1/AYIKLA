import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AD_SINIRI, disariAktar, dosyaOzeti, guvenliAd, hedefKlasor } from '../src/motor/disari-aktar';
import { geciciKlasor } from './yardimci';

const TARIH = '2024-02-15T10:00:00.000Z';

describe('Windows dosya adları', () => {
  it('ayrılmış adlar (uzantılı da) kullanılmaz', () => {
    expect(guvenliAd('CON')).toBe('CON_');
    expect(guvenliAd('nul')).toBe('nul_');
    expect(guvenliAd('Com1')).toBe('Com1_');
    expect(guvenliAd('LPT9')).toBe('LPT9_');
    expect(guvenliAd('aux.txt')).toBe('aux_.txt');
    expect(guvenliAd('PRN ')).toBe('PRN_');
    expect(guvenliAd('Console')).toBe('Console');
    expect(guvenliAd('COM10')).toBe('COM10');
  });

  it('sondaki nokta/boşluk, kontrol karakteri, boş ad', () => {
    expect(guvenliAd('Deniz...')).toBe('Deniz');
    expect(guvenliAd('Deniz . ')).toBe('Deniz');
    expect(guvenliAd('a\u0001b\tc')).toBe('a-b-c');
    expect(guvenliAd('   ')).toBe('Adsız');
    expect(guvenliAd('...')).toBe('Adsız');
  });

  it('Türkçe ad NFC olur; uzun ad kısalır, emoji bölünmez', () => {
    expect(guvenliAd('Çiğdem Şükrü')).toBe('Çiğdem Şükrü');
    expect(guvenliAd('İĞÜŞÖÇ ığüşöç')).toBe('İĞÜŞÖÇ ığüşöç');
    const uzun = guvenliAd('a'.repeat(AD_SINIRI - 1) + '😀😀');
    expect(uzun).toBe('a'.repeat(AD_SINIRI - 1));
    expect(guvenliAd('x'.repeat(500)).length).toBe(AD_SINIRI);
  });

  it('"CON" grubu ve Türkçe adlı dosya dışa aktarılır', async () => {
    const t = await geciciKlasor();
    const kaynak = join(t, 'kaynak');
    await mkdir(kaynak);
    const nfd = join(kaynak, 'Çiğdem.jpg');
    const turkce = join(kaynak, 'İğde ağacı ışık.jpg');
    await writeFile(nfd, 'bir');
    await writeFile(turkce, 'iki');
    const hedef = join(t, 'hedef');
    const r = await disariAktar(
      [
        { yol: nfd, grupAdi: 'CON', tarih: TARIH },
        { yol: turkce, grupAdi: 'Doğa / Ağaç', tarih: TARIH },
      ],
      hedef,
    );
    expect(r).toMatchObject({ kopyalanan: 2, hatalar: [] });
    expect(await readdir(hedefKlasor(hedef, 'CON', TARIH))).toEqual(['Çiğdem.jpg']); // NFC adla
    expect(hedefKlasor(hedef, 'CON', TARIH)).toContain(join('CON_', '2024', '02-Şubat'));
    expect(await readdir(hedefKlasor(hedef, 'Doğa / Ağaç', TARIH))).toEqual(['İğde ağacı ışık.jpg']);
  });

  it('260 karakteri aşan yola kopyalar ve doğrular', async () => {
    const t = await geciciKlasor();
    await writeFile(join(t, 'kaynak.jpg'), 'uzun yol');
    let kok = join(t, 'hedef');
    while (kok.length < 230) kok = join(kok, 'çok uzun bir klasör adı');
    const grup = 'Grup adı da oldukça uzun tutuldu';
    const r = await disariAktar([{ yol: join(t, 'kaynak.jpg'), grupAdi: grup, tarih: TARIH }], kok);
    expect(r).toMatchObject({ kopyalanan: 1, hatalar: [] });
    const dosya = join(hedefKlasor(kok, grup, TARIH), 'kaynak.jpg');
    expect(dosya.length).toBeGreaterThan(260);
    expect(existsSync(dosya)).toBe(true);
    expect(await dosyaOzeti(dosya)).toBe(await dosyaOzeti(join(t, 'kaynak.jpg')));
  });
});
