/**
 * FAZ 1 #12 — uçtan uca kabul testi (talimat bölüm 6, DoD 1–4).
 * Her senaryonun sonucu `docs/IMPLEMENTATION_ROADMAP.md` "FAZ 1 #12 kabul raporu" tablosunda
 * geçti / başarısız / çalıştırılamadı diye yazılıdır. Bu dosyada yalnız çalıştırılabilen senaryolar var.
 */
import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ARSIV_KATALOGU, Arsiv } from '../src/motor/arsiv';
import { albumdenKaldir, albumeEkle, albumOlustur, ara, etiketle } from '../src/motor/arsiv-album';
import { blobAl, blobYolu, iceAl, ogeAl } from '../src/motor/arsiv-depo';
import { KURTARILAMAYAN_BILGILER, katalogKurtar } from '../src/motor/arsiv-kurtar';
import { kaliciSil, kutudanGeriAl, kutuyaTasi, kutuyuBosalt } from '../src/motor/arsiv-kutu';
import { saglikDenetimi } from '../src/motor/arsiv-saglik';
import { arsivYedekle, yedekDogrula, yedektenGeriYukle } from '../src/motor/arsiv-yedek';
import { disariAktar } from '../src/motor/disari-aktar';
import { acikArsiv, klasorGoruntusu, medyaDosyalari } from './yardimci';

const GUN = 24 * 60 * 60 * 1000;
const say = (a: Arsiv, tablo: string) => (a.vt.prepare(`SELECT COUNT(*) AS n FROM ${tablo}`).get() as { n: number }).n;

/** Kaynakta iç içe klasörler, Türkçe ad, aynı içerikli iki dosya, foto ve video. */
async function kaynakHazirla(kaynak: string): Promise<string[]> {
  const dosyalar: [string, string][] = [
    ['Telefon/IMG_0001.jpg', 'deniz'],
    ['Telefon/IMG_0002.jpg', 'orman'],
    ['Yedek/İğde ağacı.png', 'ağaç'],
    ['Yedek/IMG_0001 kopya.jpg', 'deniz'],
    ['Video/tatil.mp4', 'video baytları'],
  ];
  const yollar: string[] = [];
  for (const [g, icerik] of dosyalar) {
    const yol = join(kaynak, ...g.split('/'));
    await mkdir(join(yol, '..'), { recursive: true });
    await writeFile(yol, icerik);
    yollar.push(yol);
  }
  return yollar;
}

describe('DoD 1 — kaynak korunması', () => {
  it('içe aktar → etiket/albüm → kutu → kalıcı sil → dışa aktar → yedek; kaynakta yol ve özet aynı', async () => {
    const { a, kaynak, t } = await acikArsiv();
    try {
      const yollar = await kaynakHazirla(kaynak);
      const once = await klasorGoruntusu(kaynak);

      const r = await iceAl(a, yollar.map((yol) => ({ yol })));
      expect(r.hatalar).toEqual([]);
      const ids = [...new Set(r.ogeler.map((o) => o.ogeId))];
      etiketle(a, ids, 'Tatil > Ege');
      albumeEkle(a, albumOlustur(a, 'Seçme'), ids.slice(0, 2));
      kutuyaTasi(a, [ids[1]]);
      await kaliciSil(a, [ids[1]]);
      const kalan = ids.filter((id) => id !== ids[1]);
      const ogeler = kalan.map((id) => {
        const o = ogeAl(a, id)!;
        return { yol: blobYolu(a, blobAl(a, o.blob_sha256)!), grupAdi: 'Tatil', tarih: o.tarih! };
      });
      expect((await disariAktar(ogeler, join(t, 'Dışa'))).kopyalanan).toBe(kalan.length);
      await arsivYedekle(a, join(t, 'Yedek'));
      expect((await yedekDogrula(join(t, 'Yedek'))).tamam).toBe(true);

      expect(await klasorGoruntusu(kaynak)).toEqual(once);
    } finally {
      await a.kapat();
    }
  });
});

describe('DoD 2 — içe aktarma tutarlılığı', () => {
  it('1.000 dosya: her kopya doğrulanır, aynı içerik tek kopya, tekrar almak çoğaltmaz', async () => {
    const { a, kaynak } = await acikArsiv();
    try {
      const yollar: string[] = [];
      for (let i = 0; i < 1000; i++) {
        const yol = join(kaynak, `IMG_${String(i).padStart(4, '0')}.jpg`);
        await writeFile(yol, `örnek ${i % 900}`); // son 100 dosya ilk 100'ün aynısı
        yollar.push(yol);
      }
      const once = await klasorGoruntusu(kaynak);
      const r = await iceAl(a, yollar.map((yol) => ({ yol })));
      expect([r.yeni, r.tekil, r.hatalar.length]).toEqual([900, 100, 0]);
      expect((await medyaDosyalari(a.kok)).length).toBe(900);
      expect(await saglikDenetimi(a)).toMatchObject({ saglam: 900, degismis: [], eksik: [], kayitsiz: [] });

      const r2 = await iceAl(a, yollar.map((yol) => ({ yol })));
      expect([r2.yeni, r2.tekil, r2.kayitli]).toEqual([0, 0, 1000]);
      expect([say(a, 'blob'), say(a, 'oge'), say(a, 'kaynak_yolu')]).toEqual([900, 900, 1000]);
      expect(await klasorGoruntusu(kaynak)).toEqual(once);
    } finally {
      await a.kapat();
    }
  }, 120_000);

  it('okunamayan ve kaybolan dosya raporlanır, diğerleri sürer', async () => {
    const { a, kaynak } = await acikArsiv();
    try {
      await writeFile(join(kaynak, 'iyi.jpg'), 'iyi');
      await mkdir(join(kaynak, 'aslinda-klasor.jpg'));
      const r = await iceAl(a, [
        { yol: join(kaynak, 'aslinda-klasor.jpg') },
        { yol: join(kaynak, 'yok-artik.jpg') },
        { yol: join(kaynak, 'iyi.jpg') },
      ]);
      expect(r.hatalar.map((h) => h.yol)).toEqual([join(kaynak, 'aslinda-klasor.jpg'), join(kaynak, 'yok-artik.jpg')]);
      expect(r.yeni).toBe(1);
    } finally {
      await a.kapat();
    }
  });

  it('disk dolması (benzetim): durur, yarım kopya kalmaz, sonraki dosyalara geçmez', async () => {
    const { a, kaynak } = await acikArsiv();
    try {
      for (const ad of ['a.jpg', 'b.jpg', 'c.jpg']) await writeFile(join(kaynak, ad), ad);
      let n = 0;
      const r = await iceAl(
        a,
        ['a.jpg', 'b.jpg', 'c.jpg'].map((ad) => ({ yol: join(kaynak, ad) })),
        undefined,
        {
          kopyadanSonra: async () => {
            if (++n === 2) throw Object.assign(new Error('ENOSPC: no space left on device'), { code: 'ENOSPC' });
          },
        },
      );
      expect(r.yeni).toBe(1);
      expect(r.hatalar).toHaveLength(1);
      expect(n).toBe(2); // c.jpg denenmedi
      expect(await medyaDosyalari(a.kok)).toHaveLength(1);
    } finally {
      await a.kapat();
    }
  });

  it('kullanıcı iptali: alınanlar kayıtlı, kalanlara dokunulmaz; yeniden başlatınca tamamlanır', async () => {
    const { a, kaynak } = await acikArsiv();
    try {
      const yollar: string[] = [];
      for (let i = 0; i < 10; i++) {
        yollar.push(join(kaynak, `${i}.jpg`));
        await writeFile(yollar[i], `x${i}`);
      }
      const iptal = new AbortController();
      const r = await iceAl(
        a,
        yollar.map((yol) => ({ yol })),
        (bitti) => {
          if (bitti === 4) iptal.abort();
        },
        undefined,
        iptal.signal,
      );
      expect(r).toMatchObject({ durduruldu: true, yeni: 4 });
      expect(await medyaDosyalari(a.kok)).toHaveLength(4);
      const r2 = await iceAl(a, yollar.map((yol) => ({ yol })));
      expect([r2.yeni, r2.kayitli]).toEqual([6, 4]);
    } finally {
      await a.kapat();
    }
  });

  it('ani kapanma: süreç yarıda öldürülür; arşiv tutarlı kalır, yeniden alma tamamlar', async () => {
    const { a, kok, kaynak } = await acikArsiv();
    await a.kapat();
    const ad = (i: number) => join(kaynak, `IMG_${String(i).padStart(4, '0')}.jpg`);
    for (let i = 0; i < 300; i++) await writeFile(ad(i), `kare ${i} `.repeat(200));

    const cocuk = spawn(process.execPath, ['--import', 'tsx', join(__dirname, 'ice-al-cocuk.ts'), kok, kaynak], {
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    const bitti = new Promise((coz) => cocuk.on('exit', coz));
    let tampon = '';
    cocuk.stdout!.on('data', (p: Buffer) => {
      tampon += p.toString();
      const m = [...tampon.matchAll(/ILERLEME (\d+)/g)].pop();
      if (m && Number(m[1]) >= 50) cocuk.kill('SIGKILL');
    });
    await bitti;
    expect(tampon).not.toContain('BITTI'); // gerçekten yarıda kaldı

    const b = await Arsiv.ac(kok, { bayatKilidiKaldir: true }); // çöken sürecin kilidi bayat
    try {
      const yarida = await saglikDenetimi(b);
      expect(yarida).toMatchObject({ katalog: 'ok', degismis: [], eksik: [], refHatali: [] });
      const alinan = say(b, 'oge');
      expect(alinan).toBeGreaterThanOrEqual(50);
      expect(alinan).toBeLessThan(300);

      const r = await iceAl(b, Array.from({ length: 300 }, (_, i) => ({ yol: ad(i) })));
      expect(r.hatalar).toEqual([]);
      expect(r.yeni + r.kayitli).toBe(300);
      expect(say(b, 'oge')).toBe(300);
      const son = await saglikDenetimi(b);
      expect(son).toMatchObject({ saglam: 300, degismis: [], eksik: [], refHatali: [] });
      // Öldürülme anında yazılmakta olan geçici dosya kalmış olabilir: kayıtsız olarak raporlanır, kayda girmez.
      expect(son.kayitsiz.every((d) => d.endsWith('.ayikla-gecici'))).toBe(true);
    } finally {
      await b.kapat();
    }
  }, 120_000);
});

describe('DoD 3 — geri dönüşüm ve referanslar', () => {
  it('albümden kaldır silmez; 30 gün kutu; geri yükleme; paylaşılan kopya korunur; kaynak durur', async () => {
    const { a, kaynak } = await acikArsiv();
    try {
      const yollar = await kaynakHazirla(kaynak);
      const once = await klasorGoruntusu(kaynak);
      const r = await iceAl(a, yollar.map((yol) => ({ yol })));
      const deniz = r.ogeler[0].ogeId; // IMG_0001 ve kopyası aynı öğe
      const orman = r.ogeler[1].ogeId;
      const al = albumOlustur(a, 'Tatil');
      albumeEkle(a, al, [deniz, orman]);

      albumdenKaldir(a, al, [deniz]);
      expect(ogeAl(a, deniz)!.silinme).toBeNull();
      expect(ara(a, { metin: 'IMG_0001' }).map((o) => o.id)).toEqual([deniz]);

      const silme = new Date('2026-01-01T00:00:00.000Z');
      kutuyaTasi(a, [orman], silme);
      expect((await kutuyuBosalt(a, new Date(silme.getTime() + 29 * GUN))).silinenOge).toBe(0);
      expect(kutudanGeriAl(a, [orman])).toEqual([orman]);

      // Paylaşılan kopya: kutudaki öğenin içeriği yeniden alınınca blob iki öğece kullanılır
      kutuyaTasi(a, [deniz], silme);
      const yeniDeniz = (await iceAl(a, [{ yol: yollar[0] }])).ogeler[0].ogeId;
      expect(blobAl(a, r.ogeler[0].sha256)!.ref_sayisi).toBe(2);
      const bos = await kutuyuBosalt(a, new Date(silme.getTime() + 31 * GUN));
      expect(bos).toMatchObject({ silinenOge: 1, silinenDosya: 0, korunanDosya: 1 });
      expect(existsSync(blobYolu(a, blobAl(a, r.ogeler[0].sha256)!))).toBe(true);
      expect(ogeAl(a, yeniDeniz)!.silinme).toBeNull();

      expect(await klasorGoruntusu(kaynak)).toEqual(once);
    } finally {
      await a.kapat();
    }
  });
});

describe('DoD 4 — veritabanı ve yedek', () => {
  it('aç/kapat, bütünlük, çevrimiçi yedek ve geri yükleme', async () => {
    const { a, kok, kaynak, t } = await acikArsiv();
    const yollar = await kaynakHazirla(kaynak);
    await iceAl(a, yollar.map((yol) => ({ yol })));
    etiketle(a, [1], 'Yer > Deniz');
    await a.kapat();

    const b = await Arsiv.ac(kok); // kapatıp yeniden açınca veri yerinde
    try {
      expect(say(b, 'oge')).toBe(4);
      expect((await saglikDenetimi(b)).katalog).toBe('ok');
      await arsivYedekle(b, join(t, 'Yedek'));
    } finally {
      await b.kapat();
    }
    await yedektenGeriYukle(join(t, 'Yedek'), join(t, 'Geri'));
    const c = await Arsiv.ac(join(t, 'Geri'));
    try {
      expect(ara(c, { etiket: 'Yer' }).length).toBe(1);
      expect((await saglikDenetimi(c)).saglam).toBe(4);
    } finally {
      await c.kapat();
    }
  });

  it('bozuk ve kayıp katalogdan yeniden keşif; geri gelmeyen bilgi dürüstçe raporlanır', async () => {
    const { a, kok, kaynak } = await acikArsiv();
    const yollar = await kaynakHazirla(kaynak);
    await iceAl(a, yollar.map((yol) => ({ yol })));
    etiketle(a, [1, 2], 'Yer > Deniz');
    albumeEkle(a, albumOlustur(a, 'Tatil'), [1]);
    await a.kapat();
    await writeFile(join(kok, 'medya', 'yabanci.txt'), 'x'); // tanımsız dosya

    // Bozuk katalog: açılamaz
    const katalog = join(kok, ARSIV_KATALOGU);
    for (const yan of ['-wal', '-shm']) await rm(katalog + yan, { force: true });
    await writeFile(katalog, 'bu bir veritabanı değil'.repeat(200));
    await expect(Arsiv.ac(kok)).rejects.toThrow();

    const rapor = await katalogKurtar(kok);
    expect(rapor.kurtarilan).toBe(4);
    expect(rapor.bozuk).toEqual([]);
    expect(rapor.tanimsiz).toEqual(['medya/yabanci.txt']);
    expect(rapor.kurtarilamayan).toEqual(KURTARILAMAYAN_BILGILER);
    expect(await readFile(rapor.kenaraAlinan!, 'utf8')).toContain('bu bir veritabanı değil'); // silinmedi

    const b = await Arsiv.ac(kok);
    try {
      expect(await saglikDenetimi(b)).toMatchObject({ saglam: 4, degismis: [], eksik: [], refHatali: [] });
      expect(ara(b, { etiket: 'Yer' })).toEqual([]); // etiketler geri gelmedi — raporda yazıyor
      await expect(katalogKurtar(kok)).rejects.toThrow(); // açıkken (kilitli) çalışmaz
    } finally {
      await b.kapat();
    }
    await expect(katalogKurtar(kok)).rejects.toThrow(/sağlam/); // sağlam katalogda çalışmaz

    // Kayıp katalog
    for (const yan of ['', '-wal', '-shm']) await rm(katalog + yan, { force: true });
    const r2 = await katalogKurtar(kok);
    expect([r2.kurtarilan, r2.kenaraAlinan]).toEqual([4, null]);
  });
});
