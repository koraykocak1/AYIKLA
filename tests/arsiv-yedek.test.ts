import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Arsiv, arsivBul } from '../src/motor/arsiv';
import { albumeEkle, albumOlustur, etiketle } from '../src/motor/arsiv-album';
import { iceAl } from '../src/motor/arsiv-depo';
import { kutuyaTasi } from '../src/motor/arsiv-kutu';
import { YEDEK_BILGISI, arsivYedekle, yedekDogrula, yedektenGeriYukle } from '../src/motor/arsiv-yedek';
import { dosyaOzeti } from '../src/motor/disari-aktar';
import { tara } from '../src/motor/tarayici';
import { acikArsiv, medyaDosyalari } from './yardimci';

const TABLOLAR = ['blob', 'oge', 'kaynak_yolu', 'album', 'album_oge', 'etiket', 'oge_etiket'];

function dokum(a: Arsiv): Record<string, unknown[]> {
  return Object.fromEntries(TABLOLAR.map((t) => [t, a.vt.prepare(`SELECT * FROM ${t} ORDER BY 1, 2`).all()]));
}

/** İçinde tekilleşmiş, albümlü, etiketli ve kutuda öğe bulunan örnek arşiv. */
async function doluArsiv() {
  const o = await acikArsiv();
  const { a, kaynak } = o;
  await writeFile(join(kaynak, 'a.jpg'), 'deniz');
  await writeFile(join(kaynak, 'a-kopya.jpg'), 'deniz');
  await writeFile(join(kaynak, 'b.mp4'), 'video baytları');
  await writeFile(join(kaynak, 'c.png'), 'orman');
  const r = await iceAl(a, ['a.jpg', 'a-kopya.jpg', 'b.mp4', 'c.png'].map((ad) => ({ yol: join(kaynak, ad) })));
  expect(r.hatalar).toEqual([]);
  const id = (ad: string) => r.ogeler.find((x) => x.yol.endsWith(ad))!.ogeId;
  albumeEkle(a, albumOlustur(a, 'Tatil'), [id('a.jpg'), id('b.mp4')]);
  etiketle(a, [id('a.jpg')], 'Yer > Deniz');
  kutuyaTasi(a, [id('c.png')]);
  return o;
}

describe('doğrulanmış yedek ve geri yükleme', () => {
  it('yedek → doğrula → başka klasöre geri yükle → katalog ve özetler aynı', async () => {
    const { a, kok, t } = await doluArsiv();
    const yedek = join(t, 'Yedek Disk', 'AYIKLA yedeği');
    let onceki: Record<string, unknown[]>;
    try {
      const s = await arsivYedekle(a, yedek);
      expect(s).toMatchObject({ kopyalanan: 3, atlanan: 0, eksik: [] });
      expect(s.bilgi.blob.sayi).toBe(3);
      onceki = dokum(a);
    } finally {
      await a.kapat();
    }
    expect(await yedekDogrula(yedek)).toMatchObject({ tamam: true, sorunlar: [] });

    const yeni = join(t, 'Geri Yuklenen');
    const g = await yedektenGeriYukle(yedek, yeni);
    expect(g.blob).toBe(3);
    const b = await Arsiv.ac(yeni);
    try {
      expect(b.kimlik.kimlik).toBe(g.kimlik.kimlik);
      expect(dokum(b)).toEqual(onceki);
      expect(await medyaDosyalari(yeni)).toEqual(await medyaDosyalari(kok));
      for (const d of await medyaDosyalari(yeni)) {
        const sha = d.split('/').pop()!.split('.')[0];
        expect(await dosyaOzeti(join(yeni, ...d.split('/')))).toBe(sha);
      }
    } finally {
      await b.kapat();
    }
  });

  it('aynı klasöre ikinci yedek yalnız yeni dosyayı kopyalar', async () => {
    const { a, kaynak, t } = await doluArsiv();
    try {
      const yedek = join(t, 'Yedek');
      await arsivYedekle(a, yedek);
      expect(await arsivYedekle(a, yedek)).toMatchObject({ kopyalanan: 0, atlanan: 3 });
      await writeFile(join(kaynak, 'd.jpg'), 'yeni');
      await iceAl(a, [{ yol: join(kaynak, 'd.jpg') }]);
      expect(await arsivYedekle(a, yedek)).toMatchObject({ kopyalanan: 1, atlanan: 3 });
      expect((await yedekDogrula(yedek)).tamam).toBe(true);
    } finally {
      await a.kapat();
    }
  });

  it('bozuk yedek "tamam" görünmez ve geri yüklenmez', async () => {
    const { a, t } = await doluArsiv();
    const yedek = join(t, 'Yedek');
    try {
      await arsivYedekle(a, yedek);
    } finally {
      await a.kapat();
    }
    // Bir blobun içeriği değişti
    const blob = (await medyaDosyalari(yedek))[0];
    await writeFile(join(yedek, ...blob.split('/')), 'bozuldu');
    const d = await yedekDogrula(yedek);
    expect(d.tamam).toBe(false);
    expect(d.sorunlar).toContain(`Bozuk dosya: ${blob}`);
    const yeni = join(t, 'Yeni');
    await expect(yedektenGeriYukle(yedek, yeni)).rejects.toThrow(/doğrulanamadı/);
    expect(existsSync(yeni)).toBe(false); // hiçbir şey yazılmadı

    // Bir blob eksik
    await rm(join(yedek, ...blob.split('/')));
    expect((await yedekDogrula(yedek)).sorunlar).toContain(`Eksik dosya: ${blob}`);

    // Katalog değişti
    const katalog = join(yedek, 'katalog', 'ayikla.db');
    const bayt = await readFile(katalog);
    bayt[bayt.length - 10] ^= 0xff;
    await writeFile(katalog, bayt);
    expect((await yedekDogrula(yedek)).sorunlar.some((s) => s.includes('Katalog dosyası'))).toBe(true);

    // Bilgi dosyası yok
    await rm(join(yedek, YEDEK_BILGISI));
    expect(await yedekDogrula(yedek)).toMatchObject({ tamam: false });
  });

  it('yanlış hedef reddedilir; yedek klasörü arşiv sanılmaz ve taranmaz', async () => {
    const { a, kok, t } = await doluArsiv();
    try {
      await mkdir(join(t, 'Dolu'));
      await writeFile(join(t, 'Dolu', 'belge.txt'), 'x');
      await expect(arsivYedekle(a, join(t, 'Dolu'))).rejects.toThrow(/boş bir klasör/);
      await expect(arsivYedekle(a, join(kok, 'yedek', 'ic'))).rejects.toThrow(/arşivin içinde/);
      await expect(arsivYedekle(a, '\\\\sunucu\\paylasim\\y')).rejects.toThrow(/ağ/);

      const yedek = join(t, 'Yedek');
      await arsivYedekle(a, yedek);
      expect(await arsivBul(a.kimlik.kimlik, null, [t], 2)).toEqual([kok]); // yalnız gerçek arşiv
      expect((await tara([t])).some((d) => d.yol.startsWith(yedek))).toBe(false);
      await expect(yedektenGeriYukle(yedek, join(t, 'Dolu'))).rejects.toThrow(/boş bir klasör/);
    } finally {
      await a.kapat();
    }
  });
});
