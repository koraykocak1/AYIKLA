import { describe, it, expect } from 'vitest';
import {
  bekleyenSayisi,
  enBuyukYaricap,
  grupYaricapi,
  grupYeri,
  halkaYeri,
  kuyrugaEkle,
  kuyruktanAl,
  yeniSahne,
} from '../src/arayuz/mantik/sahneDuzeni';
import { grupKuresi } from '../src/arayuz/hareket';

describe('toz kuyruğu', () => {
  it('arka arkaya aynı yere gidenleri tek kayıtta biriktirir', () => {
    const s = yeniSahne();
    kuyrugaEkle(s, 'doga');
    kuyrugaEkle(s, 'doga');
    kuyrugaEkle(s, 'yemek');
    kuyrugaEkle(s, 'elenecek', 'doga');
    expect(s.kuyruk).toEqual([
      { grup: 'doga', kaynak: null, n: 2 },
      { grup: 'yemek', kaynak: null, n: 1 },
      { grup: 'elenecek', kaynak: 'doga', n: 1 },
    ]);
    expect(bekleyenSayisi(s)).toBe(4);
  });

  it('paketlere bölünse de hiçbir fotoğraf kaybolmaz', () => {
    const s = yeniSahne();
    for (let i = 0; i < 2000; i++) kuyrugaEkle(s, i % 7 ? 'insanlar' : 'elenecek');
    const toplam: Record<string, number> = {};
    for (let b = kuyruktanAl(s, 13); b; b = kuyruktanAl(s, 13)) {
      expect(b.n).toBeGreaterThan(0);
      expect(b.n).toBeLessThanOrEqual(13);
      toplam[b.grup] = (toplam[b.grup] ?? 0) + b.n;
    }
    expect(toplam.insanlar + toplam.elenecek).toBe(2000);
    expect(toplam.elenecek).toBe(286);
    expect(bekleyenSayisi(s)).toBe(0);
  });
});

describe('yerleşim', () => {
  it('küreler kenarlardan eşit uzaklıkta, soldan sağa dizilir', () => {
    const W = 1400;
    const H = 900;
    const ilk = grupYeri(0, 6, W, H);
    const son = grupYeri(5, 6, W, H);
    expect(ilk.x).toBeCloseTo(W - son.x);
    for (let i = 1; i < 6; i++) expect(grupYeri(i, 6, W, H).x).toBeGreaterThan(grupYeri(i - 1, 6, W, H).x);
  });

  it('en büyük küreler bile komşusuna değmez', () => {
    for (const adet of [3, 6, 12]) {
      const W = 1000;
      const r = enBuyukYaricap(adet, W, 700);
      const aralik = grupYeri(1, adet, W, 700).x - grupYeri(0, adet, W, 700).x;
      expect(2 * r).toBeLessThan(aralik);
    }
  });

  it('küre fotoğraf geldikçe büyür, sınırı aşmaz', () => {
    const enBuyuk = 40;
    expect(grupYaricapi(0, 1000, enBuyuk)).toBe(grupKuresi.enKucuk);
    expect(grupYaricapi(-3, 1000, enBuyuk)).toBe(grupKuresi.enKucuk);
    expect(grupYaricapi(100, 1000, enBuyuk)).toBeGreaterThan(grupYaricapi(10, 1000, enBuyuk));
    expect(grupYaricapi(1000, 1000, enBuyuk)).toBe(enBuyuk);
  });

  it('halka ayıklama ilerledikçe küçülür ve AYIKLA yazısının altında kalır', () => {
    const bas = halkaYeri(1400, 900, 0);
    const son = halkaYeri(1400, 900, 1);
    expect(son.r).toBeLessThan(bas.r);
    expect(bas.y - bas.r).toBeGreaterThan(900 * 0.45);
  });
});
