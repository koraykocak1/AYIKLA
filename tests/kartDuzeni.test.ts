import { describe, it, expect } from 'vitest';
import { KART, gorunenAralik, izgaraYerlesimi, kureYerlesimi } from '../src/arayuz/mantik/kartDuzeni';
import { tarihSaat } from '../src/arayuz/mantik/bicim';
import type { YilBolumu } from '../src/arayuz/mantik/gruplama';
import type { ArayuzMedya } from '../src/ortak/mesajlar';

const medya = (n: number, on: string) => Array.from({ length: n }, (_, i) => ({ anahtar: `${on}${i}` }) as ArayuzMedya);

const bolumler: YilBolumu[] = [
  { yil: 2024, aylar: [{ ay: 10, medya: medya(7, 'e') }, { ay: 3, medya: medya(2, 'm') }] },
  { yil: 2023, aylar: [{ ay: 12, medya: medya(1, 'a') }] },
];

describe('tarihSaat', () => {
  it('gün, büyük harf ay, yıl ve iki haneli saat verir', () => {
    expect(tarihSaat(new Date(2024, 9, 21, 20, 18).toISOString())).toEqual({ tarih: '21 EKİM 2024', saat: '20:18' });
    expect(tarihSaat(new Date(2023, 0, 5, 7, 3).toISOString()).saat).toBe('07:03');
  });
});

describe('izgaraYerlesimi', () => {
  it('her kartı bir kez, sırayla yerleştirir; başlıklar yıl › ay sırasında', () => {
    const y = izgaraYerlesimi(bolumler, 700);
    expect(y.kartlar.map((k) => k.sira)).toEqual([...Array(10).keys()]);
    expect(y.basliklar.map((b) => `${b.tur}:${b.metin}:${b.adet}`)).toEqual(['yil:2024:9', 'ay:Ekim:7', 'ay:Mart:2', 'yil:2023:1', 'ay:Aralık:1']);
  });

  it('kartlar en az 160 px, satıra sığar ve üst üste binmez', () => {
    const y = izgaraYerlesimi(bolumler, 700); // 4 sütun
    expect(y.kartEn).toBeGreaterThanOrEqual(KART.en);
    for (const k of y.kartlar) expect(k.x + y.kartEn).toBeLessThanOrEqual(700 + 0.001);
    const ekim = y.kartlar.slice(0, 7);
    expect(ekim[4].x).toBe(0); // 5. kart alt satıra iner
    expect(ekim[4].y).toBeGreaterThanOrEqual(ekim[0].y + y.kartBoy + KART.etiket);
    for (let i = 1; i < y.kartlar.length; i++) expect(y.kartlar[i].y).toBeGreaterThanOrEqual(y.kartlar[i - 1].y);
    expect(y.yukseklik).toBeGreaterThan(y.kartlar[y.kartlar.length - 1].y + y.kartBoy);
  });

  it('dar alanda tek sütuna düşer', () => {
    const y = izgaraYerlesimi(bolumler, 100);
    expect(new Set(y.kartlar.map((k) => k.x))).toEqual(new Set([0]));
  });
});

describe('gorunenAralik', () => {
  it('yalnız ekrana giren kartları verir', () => {
    const b: YilBolumu[] = [{ yil: 2024, aylar: [{ ay: 1, medya: medya(400, 'x') }] }];
    const y = izgaraYerlesimi(b, 700);
    const [bas, son] = gorunenAralik(y.kartlar, 2000, 2600, y.kartBoy);
    expect(bas).toBeGreaterThan(0);
    expect(son).toBeLessThan(400);
    for (const k of y.kartlar.slice(bas, son)) {
      expect(k.y + y.kartBoy + KART.etiket).toBeGreaterThanOrEqual(2000);
      expect(k.y).toBeLessThan(2600);
    }
    expect(gorunenAralik(y.kartlar, 0, 10_000_000, y.kartBoy)).toEqual([0, 400]);
  });
});

describe('kureYerlesimi', () => {
  it('kartlar küre yüzeyinde durur; öndekiler büyük görünür', () => {
    for (let i = 0; i < 50; i++) {
      const p = kureYerlesimi(i, 50, 0.7, 0.3, 200);
      expect(Math.abs(p.z)).toBeLessThanOrEqual(1);
      expect(Math.hypot(p.x, p.y) / p.olcek).toBeLessThanOrEqual(200 + 1e-6);
    }
    const a = [...Array(80).keys()].map((i) => kureYerlesimi(i, 80, 0, 0, 100));
    const onde = a.reduce((p, q) => (q.z > p.z ? q : p));
    const arkada = a.reduce((p, q) => (q.z < p.z ? q : p));
    expect(onde.olcek).toBeGreaterThan(arkada.olcek);
  });
});
