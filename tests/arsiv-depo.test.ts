import { describe, it, expect } from 'vitest';
import { appendFile, copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Arsiv } from '../src/motor/arsiv';
import { blobAl, blobYolu, iceAl, kaynakYollari, ogeAl } from '../src/motor/arsiv-depo';
import { dosyaOzeti } from '../src/motor/disari-aktar';
import { acikArsiv, klasorGoruntusu, medyaDosyalari } from './yardimci';

const say = (a: Arsiv, tablo: string) => (a.vt.prepare(`SELECT COUNT(*) AS n FROM ${tablo}`).get() as { n: number }).n;

describe('içerik adresli içe aktarma', () => {
  it('aynı bayt iki kaynaktan → 1 blob, 1 öğe, 2 kaynak yolu; kaynak değişmez', async () => {
    const { a, kok, kaynak } = await acikArsiv();
    try {
      await mkdir(join(kaynak, 'Telefon'));
      await mkdir(join(kaynak, 'Yedek Disk'));
      await writeFile(join(kaynak, 'Telefon', 'IMG_0001.jpg'), 'deniz kenarı');
      await copyFile(join(kaynak, 'Telefon', 'IMG_0001.jpg'), join(kaynak, 'Yedek Disk', 'tatil kopya.JPG'));
      const once = await klasorGoruntusu(kaynak);

      const r = await iceAl(a, [
        { yol: join(kaynak, 'Telefon', 'IMG_0001.jpg') },
        { yol: join(kaynak, 'Yedek Disk', 'tatil kopya.JPG') },
      ]);
      expect(r.hatalar).toEqual([]);
      expect([r.yeni, r.tekil, r.kayitli]).toEqual([1, 1, 0]);
      expect(r.ogeler[0].ogeId).toBe(r.ogeler[1].ogeId);

      const sha = await dosyaOzeti(join(kaynak, 'Telefon', 'IMG_0001.jpg'));
      expect(await medyaDosyalari(kok)).toEqual([`medya/${sha.slice(0, 2)}/${sha}.jpg`]);
      const blob = blobAl(a, sha)!;
      expect(blob.ref_sayisi).toBe(1);
      expect(await dosyaOzeti(blobYolu(a, blob))).toBe(sha);
      expect(say(a, 'oge')).toBe(1);
      expect(kaynakYollari(a, r.ogeler[0].ogeId).map((k) => k.yol).sort()).toEqual(
        [join(kaynak, 'Telefon', 'IMG_0001.jpg'), join(kaynak, 'Yedek Disk', 'tatil kopya.JPG')].sort(),
      );
      const oge = ogeAl(a, r.ogeler[0].ogeId)!;
      expect(oge).toMatchObject({ ad_orijinal: 'IMG_0001.jpg', tur: 'foto', asama: 'kopyalandi', silinme: null });

      expect(await klasorGoruntusu(kaynak)).toEqual(once); // kaynak yalnız okundu
    } finally {
      await a.kapat();
    }
  });

  it('ikinci kez içe almak hiçbir şeyi çoğaltmaz; farklı içerik ayrı blob olur', async () => {
    const { a, kok, kaynak } = await acikArsiv();
    try {
      await writeFile(join(kaynak, 'a.jpg'), 'bir');
      await writeFile(join(kaynak, 'b.png'), 'iki');
      await iceAl(a, [{ yol: join(kaynak, 'a.jpg') }, { yol: join(kaynak, 'b.png') }]);
      const r = await iceAl(a, [{ yol: join(kaynak, 'a.jpg') }, { yol: join(kaynak, 'b.png') }]);
      expect([r.yeni, r.tekil, r.kayitli]).toEqual([0, 0, 2]);
      expect((await medyaDosyalari(kok)).length).toBe(2);
      expect([say(a, 'blob'), say(a, 'oge'), say(a, 'kaynak_yolu')]).toEqual([2, 2, 2]);
    } finally {
      await a.kapat();
    }
  });

  it('köken: tarih verilmezse dosya tarihi, verilirse o; Türkçe ad NFC saklanır', async () => {
    const { a, kaynak } = await acikArsiv();
    try {
      const nfd = 'Çiğdem.jpg'; // Mac'ten gelmiş ayrışık yazım
      await writeFile(join(kaynak, nfd), 'x');
      await writeFile(join(kaynak, 'v.mp4'), 'y');
      const r = await iceAl(a, [{ yol: join(kaynak, nfd) }, { yol: join(kaynak, 'v.mp4'), tarih: '2024-07-01T10:00:00.000Z' }]);
      expect(r.hatalar).toEqual([]);
      expect(ogeAl(a, r.ogeler[0].ogeId)!.ad_orijinal).toBe('Çiğdem.jpg');
      expect(ogeAl(a, r.ogeler[1].ogeId)).toMatchObject({ tur: 'video', tarih: '2024-07-01T10:00:00.000Z' });
      expect(kaynakYollari(a, r.ogeler[0].ogeId)[0].cihaz.length).toBeGreaterThan(0);
    } finally {
      await a.kapat();
    }
  });

  it('arşivin içinden ve desteklenmeyen dosya alınmaz', async () => {
    const { a, kok, kaynak } = await acikArsiv();
    try {
      await writeFile(join(kok, 'medya', 'icerde.jpg'), 'x');
      await writeFile(join(kaynak, 'not.txt'), 'x');
      const r = await iceAl(a, [{ yol: join(kok, 'medya', 'icerde.jpg') }, { yol: join(kaynak, 'not.txt') }]);
      expect(r.hatalar.map((h) => h.hata)).toEqual(['Bu dosya zaten arşivin içinde', 'Desteklenmeyen dosya türü']);
      expect(say(a, 'oge')).toBe(0);
    } finally {
      await a.kapat();
    }
  });

  it('kopyalanırken değişen kaynak kaydedilmez; yarım kopya kalmaz', async () => {
    const { a, kok, kaynak } = await acikArsiv();
    try {
      const yol = join(kaynak, 'oynak.jpg');
      await writeFile(yol, 'ilk hâl');
      const r = await iceAl(a, [{ yol }], undefined, {
        kopyadanSonra: async () => {
          await appendFile(yol, '+');
        },
      });
      expect(r.hatalar[0].hata).toMatch(/kaynak dosya değişti/);
      expect(await medyaDosyalari(kok)).toEqual([]);
      expect(say(a, 'blob')).toBe(0);
    } finally {
      await a.kapat();
    }
  });

  it('çökmeden kalmış kayıtsız blob bozuksa kenara alınır; silinmiş blob yeniden konur', async () => {
    const { a, kok, kaynak } = await acikArsiv();
    try {
      const yol = join(kaynak, 'a.jpg');
      await writeFile(yol, 'asıl içerik');
      const sha = await dosyaOzeti(yol);
      const hedef = join(kok, 'medya', sha.slice(0, 2), `${sha}.jpg`);
      await mkdir(join(hedef, '..'), { recursive: true });
      await writeFile(hedef, 'bozuk!!!!!!'); // aynı ad, yanlış içerik
      const r = await iceAl(a, [{ yol }]);
      expect(r.yeni).toBe(1);
      expect(await readFile(hedef, 'utf8')).toBe('asıl içerik');
      expect((await medyaDosyalari(kok)).some((d) => d.includes('.bozuk-'))).toBe(true);

      await rm(hedef);
      const r2 = await iceAl(a, [{ yol }]);
      expect(r2.kayitli).toBe(1);
      expect(await readFile(hedef, 'utf8')).toBe('asıl içerik');
    } finally {
      await a.kapat();
    }
  });
});
