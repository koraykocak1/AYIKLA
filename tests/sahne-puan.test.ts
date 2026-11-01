import { describe, it, expect } from 'vitest';
import { normalize, benzerlik, grupSec, ortalamaVektor } from '../src/motor/sahne-puan';
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

  it('grup yoksa Diğer', () => {
    expect(grupSec([1, 0, 0], []).grupId).toBe(DIGER_ID);
  });

  it('ortalama vektör normalizedir', () => {
    expect(ortalamaVektor([[1, 0], [0, 1]])[0]).toBeCloseTo(Math.SQRT1_2);
  });
});
