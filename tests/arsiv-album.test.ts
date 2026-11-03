import { describe, it, expect } from 'vitest';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Arsiv } from '../src/motor/arsiv';
import {
  albumAdiniDegistir,
  albumdenKaldir,
  albumeEkle,
  albumler,
  albumOlustur,
  albumSil,
  ara,
  etiketiKaldir,
  etiketle,
  etiketler,
  ogeninAlbumleri,
  ogeninEtiketleri,
} from '../src/motor/arsiv-album';
import { iceAl, ogeAl } from '../src/motor/arsiv-depo';
import { kaliciSil, kutudanGeriAl, kutuyaTasi } from '../src/motor/arsiv-kutu';
import { acikArsiv, medyaDosyalari } from './yardimci';

/** Kaynağa farklı içerikte dosyalar yazıp içe alır; ad → öğe kimliği. */
async function ornekler(a: Arsiv, kaynak: string, liste: { ad: string; tarih: string }[]): Promise<Record<string, number>> {
  for (const o of liste) await writeFile(join(kaynak, o.ad), `içerik ${o.ad}`);
  const r = await iceAl(
    a,
    liste.map((o) => ({ yol: join(kaynak, o.ad), tarih: o.tarih })),
  );
  expect(r.hatalar).toEqual([]);
  return Object.fromEntries(liste.map((o, i) => [o.ad, r.ogeler[i].ogeId]));
}

describe('sanal albüm', () => {
  it('bir öğe iki albümde, diskte tek kopya; albümden kaldırmak silmez', async () => {
    const { a, kok, kaynak } = await acikArsiv();
    try {
      const id = (await ornekler(a, kaynak, [{ ad: 'plaj.jpg', tarih: '2024-07-01T10:00:00.000Z' }]))['plaj.jpg'];
      const tatil = albumOlustur(a, 'Tatil 2024');
      const aile = albumOlustur(a, 'Aile');
      expect(albumeEkle(a, tatil, [id])).toBe(1);
      expect(albumeEkle(a, aile, [id])).toBe(1);
      expect(albumeEkle(a, aile, [id])).toBe(0); // zaten ekli
      expect(await medyaDosyalari(kok)).toHaveLength(1);
      expect(albumler(a).map((x) => [x.ad, x.oge_sayisi])).toEqual([
        ['Aile', 1],
        ['Tatil 2024', 1],
      ]);
      expect(ogeninAlbumleri(a, id)).toEqual(['Aile', 'Tatil 2024']);

      expect(albumdenKaldir(a, tatil, [id])).toBe(1);
      expect(ogeAl(a, id)!.silinme).toBeNull(); // kutuya gitmedi
      expect(ogeninAlbumleri(a, id)).toEqual(['Aile']);

      albumSil(a, aile);
      expect(ogeAl(a, id)).toBeDefined();
      expect(await medyaDosyalari(kok)).toHaveLength(1);
    } finally {
      await a.kapat();
    }
  });

  it('albüm adı büyük/küçük harf (Türkçe dahil) fark etmeden tektir', async () => {
    const { a } = await acikArsiv();
    try {
      const x = albumOlustur(a, '  İzmir   Gezisi ');
      expect(albumOlustur(a, 'izmir gezisi')).toBe(x);
      expect(albumler(a)[0].ad).toBe('İzmir Gezisi');
      const y = albumOlustur(a, 'Ankara');
      expect(() => albumAdiniDegistir(a, y, 'İZMİR GEZİSİ')).toThrow(/zaten var/);
      expect(() => albumOlustur(a, '   ')).toThrow(/boş/);
    } finally {
      await a.kapat();
    }
  });

  it('kutudaki öğe albüm sayısına girmez; kalıcı silinince bağ da gider; geri alınca bağ taşınır', async () => {
    const { a, kaynak } = await acikArsiv();
    try {
      const ids = await ornekler(a, kaynak, [
        { ad: 'a.jpg', tarih: '2024-01-01T00:00:00.000Z' },
        { ad: 'b.jpg', tarih: '2024-01-02T00:00:00.000Z' },
      ]);
      const al = albumOlustur(a, 'Seçme');
      albumeEkle(a, al, [ids['a.jpg'], ids['b.jpg']]);
      etiketle(a, [ids['a.jpg']], 'Deniz');
      kutuyaTasi(a, [ids['a.jpg']]);
      expect(albumler(a)[0].oge_sayisi).toBe(1);

      // a.jpg ile aynı içerik başka yoldan yeniden gelirse ve eski öğe geri alınırsa bağlar yeni öğeye geçer
      await writeFile(join(kaynak, 'a-kopya.jpg'), 'içerik a.jpg');
      const yeni = (await iceAl(a, [{ yol: join(kaynak, 'a-kopya.jpg') }])).ogeler[0].ogeId;
      expect(kutudanGeriAl(a, [ids['a.jpg']])).toEqual([yeni]);
      expect(ogeninAlbumleri(a, yeni)).toEqual(['Seçme']);
      expect(ogeninEtiketleri(a, yeni)).toEqual(['Deniz']);

      kutuyaTasi(a, [ids['b.jpg']]);
      await kaliciSil(a, [ids['b.jpg']]);
      expect(a.vt.prepare('SELECT COUNT(*) AS n FROM album_oge WHERE oge_id = ?').get(ids['b.jpg'])).toEqual({ n: 0 });
      expect(albumler(a)[0].oge_sayisi).toBe(1);
    } finally {
      await a.kapat();
    }
  });
});

describe('etiket', () => {
  it('hiyerarşik etiket: üst etiketle süzmek alt etiketleri kapsar', async () => {
    const { a, kaynak } = await acikArsiv();
    try {
      const ids = await ornekler(a, kaynak, [
        { ad: 'araba.jpg', tarih: '2024-03-01T00:00:00.000Z' },
        { ad: 'bisiklet.jpg', tarih: '2024-03-02T00:00:00.000Z' },
        { ad: 'kedi.jpg', tarih: '2024-03-03T00:00:00.000Z' },
      ]);
      etiketle(a, [ids['araba.jpg']], 'Araçlar > Otomobil');
      etiketle(a, [ids['bisiklet.jpg']], 'araçlar>Bisiklet'); // aynı üst etiket, farklı yazım
      etiketle(a, [ids['kedi.jpg']], 'Hayvanlar');
      expect(etiketler(a).map((e) => e.yol)).toEqual(['Araçlar', 'Araçlar > Bisiklet', 'Araçlar > Otomobil', 'Hayvanlar']);

      expect(ara(a, { etiket: 'Araçlar > Otomobil' }).map((o) => o.ad_orijinal)).toEqual(['araba.jpg']);
      expect(ara(a, { etiket: 'Araçlar' }).map((o) => o.ad_orijinal).sort()).toEqual(['araba.jpg', 'bisiklet.jpg']);
      expect(ara(a, { etiket: 'Yok' })).toEqual([]);

      expect(etiketiKaldir(a, [ids['araba.jpg']], 'Araçlar > Otomobil')).toBe(1);
      expect(ogeninEtiketleri(a, ids['araba.jpg'])).toEqual([]);
    } finally {
      await a.kapat();
    }
  });
});

describe('klasik arama', () => {
  it('"2024 deniz": yıl ve etiket/ad/albüm sözcükleri birlikte', async () => {
    const { a, kaynak } = await acikArsiv();
    try {
      const ids = await ornekler(a, kaynak, [
        { ad: 'IMG_0001.jpg', tarih: '2024-07-10T12:00:00.000Z' }, // 2024, deniz etiketi
        { ad: 'IMG_0002.jpg', tarih: '2023-07-10T12:00:00.000Z' }, // 2023, deniz etiketi
        { ad: 'IMG_0003.jpg', tarih: '2024-05-01T12:00:00.000Z' }, // 2024, orman
        { ad: 'Deniz kıyısı.mp4', tarih: '2024-08-01T12:00:00.000Z' }, // adında "Deniz"
        { ad: 'IMG_0005.jpg', tarih: '2024-09-01T12:00:00.000Z' }, // "Deniz Tatili" albümünde
      ]);
      etiketle(a, [ids['IMG_0001.jpg'], ids['IMG_0002.jpg']], 'Yer > Deniz');
      etiketle(a, [ids['IMG_0003.jpg']], 'Yer > Orman');
      albumeEkle(a, albumOlustur(a, 'Deniz Tatili'), [ids['IMG_0005.jpg']]);

      const adlar = (s: Parameters<typeof ara>[1]) => ara(a, s).map((o) => o.ad_orijinal);
      expect(adlar({ metin: '2024 deniz' })).toEqual(['IMG_0005.jpg', 'Deniz kıyısı.mp4', 'IMG_0001.jpg']);
      expect(adlar({ metin: 'DENİZ 2023' })).toEqual(['IMG_0002.jpg']);
      expect(adlar({ metin: 'yer' }).length).toBe(3); // üst etiket adı da aranır
      expect(adlar({ metin: 'img_0003' })).toEqual(['IMG_0003.jpg']);
      expect(adlar({ tur: 'video' })).toEqual(['Deniz kıyısı.mp4']);
      expect(adlar({ baslangic: '2024-07-01', bitis: '2024-08-01' })).toEqual(['Deniz kıyısı.mp4', 'IMG_0001.jpg']);
      expect(adlar({ metin: '2024 deniz', tur: 'foto' })).toEqual(['IMG_0005.jpg', 'IMG_0001.jpg']);

      kutuyaTasi(a, [ids['IMG_0001.jpg']]);
      expect(adlar({ metin: '2024 deniz' })).toEqual(['IMG_0005.jpg', 'Deniz kıyısı.mp4']);
      expect(adlar({ kutu: true })).toEqual(['IMG_0001.jpg']);
    } finally {
      await a.kapat();
    }
  });
});
