import { describe, it, expect } from 'vitest';
import { normalize, benzerlik, grupSec, ortalamaVektor, cihazTutarliMi } from '../src/motor/sahne-puan';
import { DIGER_ID } from '../src/motor/gruplar';

describe('sahne-puan', () => {
  it('normalize birim uzunluk verir', () => {
    const v = normalize([3, 4]);
    expect(v[0]).toBeCloseTo(0.6);
    expect(v[1]).toBeCloseTo(0.8);
  });

  it('benzerlik iç çarpımdır', () => {
    expect(benzerlik([1, 0], [0, 1])).toBe(0);
    expect(benzerlik([1, 0], [1, 0])).toBe(1);
  });

  const gruplar = [
    { grupId: 'kirmizi', vektorler: [[1, 0, 0]] },
    { grupId: 'mavi', vektorler: [[0, 0, 1]] },
  ];

  it('en benzer grubu seçer', () => {
    expect(grupSec(normalize([0.9, 0.1, 0.1]), gruplar).grupId).toBe('kirmizi');
  });

  it('iki grup arasında kararsız kalırsa Diğer der', () => {
    expect(grupSec(normalize([1, 0, 1]), gruplar).grupId).toBe(DIGER_ID);
  });

  it('birçok tarifi uyan grup, tek tarifi az farkla önde olan gruba üstün gelir', () => {
    const v = normalize([1, 1, 0]);
    const g = [
      { grupId: 'tek', vektorler: [normalize([1, 0.05, 0])] }, // en iyi tek tarif bu grupta
      { grupId: 'cok', vektorler: [normalize([0.04, 1, 0]), normalize([0.04, 1, 0]), normalize([0.04, 1, 0])] },
    ];
    expect(grupSec(v, g).grupId).toBe('cok');
  });

  it('grup yoksa Diğer', () => {
    expect(grupSec([1, 0, 0], []).grupId).toBe(DIGER_ID);
  });

  it('ortalama vektör normalizedir', () => {
    expect(ortalamaVektor([[1, 0], [0, 1]])[0]).toBeCloseTo(Math.SQRT1_2);
  });
});

describe('cihazTutarliMi', () => {
  const referans = [normalize([1, 0, 0]), normalize([0, 1, 0])];

  it('ekran kartı işlemciyle aynı sonucu verirse güvenilir', () => {
    expect(cihazTutarliMi([normalize([1, 0.01, 0]), normalize([0, 1, 0.01])], referans)).toBe(true);
  });

  it('her resme aynı vektörü veren ekran kartını reddeder', () => {
    const sabit = normalize([0.5, 0.5, 0.7]);
    expect(cihazTutarliMi([sabit, sabit], referans)).toBe(false);
  });

  it('sayılar eksik veya bozuksa reddeder', () => {
    expect(cihazTutarliMi([normalize([1, 0, 0])], referans)).toBe(false);
    expect(cihazTutarliMi([[NaN, 0, 0], normalize([0, 1, 0])], referans)).toBe(false);
  });
});
