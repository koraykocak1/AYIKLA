import { describe, it, expect } from 'vitest';
import { HizOlcer } from '../src/arayuz/mantik/zaman';

describe('HizOlcer', () => {
  it('yeterli veri yoksa tahmin vermez', () => {
    const h = new HizOlcer();
    h.ekle(0);
    h.ekle(1000);
    expect(h.kalan(10)).toBeNull();
  });

  it('son dosyaların hızından kalan süreyi hesaplar', () => {
    const h = new HizOlcer();
    for (const t of [0, 1000, 2000, 3000]) h.ekle(t);
    expect(h.kalan(10)).toBeCloseTo(10);
  });

  it('yalnızca son pencereyi dikkate alır', () => {
    const h = new HizOlcer(3);
    for (const t of [0, 10000, 10500, 11000]) h.ekle(t);
    expect(h.kalan(4)).toBeCloseTo(2);
  });
});
