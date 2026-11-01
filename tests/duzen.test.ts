import { describe, it, expect } from 'vitest';
import { grupMerkezi, ELENECEK_KOSESI, yiginKonumu, kumeKonumu, yuzde, etiketBoyu, etiketNoktasi, type Nokta } from '../src/arayuz/mantik/duzen';

const uzaklik = (a: Nokta, b: Nokta) => Math.hypot(a.x - b.x, a.y - b.y);
const EN = 1.6;

describe('duzen', () => {
  it('grup merkezleri birbirinden ayrı ve ekranın içinde', () => {
    for (const n of [1, 5, 11, 14]) {
      const p = Array.from({ length: n }, (_, i) => grupMerkezi(i, n, EN));
      for (const q of p) {
        expect(Math.abs(q.x)).toBeLessThan(10 * EN - 1.5);
        expect(Math.abs(q.y)).toBeLessThan(10 - 1.5);
      }
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) expect(uzaklik(p[i], p[j])).toBeGreaterThan(1.5);
    }
  });

  it('ilk grup üstte ortada', () => {
    const p = grupMerkezi(0, 4, EN);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeGreaterThan(5);
  });

  it('elenecek köşesi sağ altta ve hiçbir grup merkezine yakın değil', () => {
    const k = ELENECEK_KOSESI(EN);
    expect(k.x).toBeGreaterThan(0);
    expect(k.y).toBeLessThan(0);
    for (let i = 0; i < 11; i++) expect(uzaklik(k, grupMerkezi(i, 11, EN))).toBeGreaterThan(2.5);
  });

  it('yığın merkezde, grup halkasının içinde kalır', () => {
    for (let i = 0; i < 2000; i += 37) {
      const p = yiginKonumu(i, 2000, 1.3);
      expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(3.01);
    }
  });

  it('küme ilk kartı merkezde, sonra yayılır ama dağılmaz', () => {
    const m = { x: 3, y: -2 };
    expect(kumeKonumu(m, 0)).toEqual(m);
    for (const k of [1, 50, 299, 5000]) expect(uzaklik(kumeKonumu(m, k), m)).toBeLessThanOrEqual(2.1);
    expect(uzaklik(kumeKonumu(m, 1), kumeKonumu(m, 2))).toBeGreaterThan(0.05);
  });

  it('yüzde: merkez %50, sol üst köşe %0', () => {
    expect(yuzde({ x: 0, y: 0 }, EN)).toEqual({ sol: 50, ust: 50 });
    expect(yuzde({ x: -10 * EN, y: 10 }, EN)).toEqual({ sol: 0, ust: 0 });
  });

  it('etiket kümenin hemen üstünde durur, kartları örtmez, üst şeride taşmaz', () => {
    for (const adet of [1, 30, 300, 5000]) {
      for (let i = 0; i < 11; i++) {
        const m = grupMerkezi(i, 11, EN);
        const e = etiketNoktasi(m, adet);
        expect(e.x).toBe(m.x);
        for (let k = 0; k < Math.min(adet, 300); k += 7) expect(e.y).toBeGreaterThan(kumeKonumu(m, k).y);
        expect(yuzde(e, EN).ust).toBeGreaterThan(8); // üst şerit ekranın ~%7'si
      }
    }
    expect(etiketNoktasi({ x: 0, y: 0 }, 1).y).toBeLessThan(etiketNoktasi({ x: 0, y: 0 }, 200).y);
  });

  it('etiket büyüklüğü adetle artar ama sınırlı', () => {
    expect(etiketBoyu(1)).toBeLessThan(etiketBoyu(100));
    expect(etiketBoyu(100000)).toBeLessThanOrEqual(28);
  });
});
