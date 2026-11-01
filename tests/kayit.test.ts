import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { KayitDeposu, anahtarUret } from '../src/motor/kayit';
import { geciciKlasor } from './yardimci';
import type { IslenmisMedya } from '../src/motor/tipler';

const ornek = (anahtar: string): IslenmisMedya => ({
  anahtar, yol: 'C:/a.jpg', tur: 'foto', boyut: 1, degisme: 1, tarih: '2024-01-01T00:00:00.000Z',
  tarihKaynagi: 'exif', tahmini: false, onizlemeler: [], genislik: 1, yukseklik: 1,
  kalite: { netlik: 1, parlaklik: 1, bulanik: false, karanlik: false }, parmakizi: '0000000000000000',
  vektor: [1, 0], grupId: 'diger', eleme: null,
});

describe('kayit', () => {
  it('anahtar yol, boyut ve tarihe bağlıdır', () => {
    const a = anahtarUret({ yol: 'x', tur: 'foto', boyut: 1, degisme: 1 });
    expect(a).toBe(anahtarUret({ yol: 'x', tur: 'foto', boyut: 1, degisme: 1 }));
    expect(a).not.toBe(anahtarUret({ yol: 'x', tur: 'foto', boyut: 2, degisme: 1 }));
  });

  it('kaydeder ve geri yükler; kullanıcı gruplarını tutar', async () => {
    const dosya = join(await geciciKlasor(), 'alt', 'kayit.json');
    const d1 = new KayitDeposu(dosya);
    await d1.yukle();
    d1.koy(ornek('a'));
    d1.veri.kullaniciGruplari.push({ id: 'k-araba', ad: 'Araba', tarifler: ['car'], kullanici: true });
    await d1.kaydet();

    const d2 = new KayitDeposu(dosya);
    await d2.yukle();
    expect(d2.al('a')?.yol).toBe('C:/a.jpg');
    expect(d2.veri.kullaniciGruplari[0].ad).toBe('Araba');
  });

  it('dosya yoksa boş başlar', async () => {
    const d = new KayitDeposu(join(await geciciKlasor(), 'yok.json'));
    await d.yukle();
    expect(d.al('a')).toBeUndefined();
  });
});
