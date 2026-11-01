import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { parmakiziHesapla, mesafe, kopyalariBul, KOPYA_ESIK } from '../src/motor/parmakizi';
import { geciciKlasor, desenliResim } from './yardimci';

describe('parmakizi', () => {
  it('aynı resmin farklı boyutları yakın, farklı resimler uzak', async () => {
    const k = await geciciKlasor();
    const a = join(k, 'a.jpg');
    const aBuyuk = join(k, 'a2.jpg');
    const b = join(k, 'b.jpg');
    await desenliResim(a, { renk: [120, 120, 120], tohum: 5, boyut: 256 });
    await desenliResim(aBuyuk, { renk: [120, 120, 120], tohum: 5, boyut: 600 });
    await desenliResim(b, { renk: [120, 120, 120], tohum: 99, boyut: 256 });
    const [pa, pa2, pb] = await Promise.all([a, aBuyuk, b].map(parmakiziHesapla));
    expect(pa).toMatch(/^[0-9a-f]{16}$/);
    expect(mesafe(pa, pa2)).toBeLessThanOrEqual(KOPYA_ESIK);
    expect(mesafe(pa, pb)).toBeGreaterThan(KOPYA_ESIK);
  });

  it('mesafe bit farkını sayar', () => {
    expect(mesafe('0000000000000000', '0000000000000000')).toBe(0);
    expect(mesafe('0000000000000000', '000000000000000f')).toBe(4);
  });

  it('kopya kümesinde en yüksek puanlıyı bırakır', () => {
    const liste = [
      { ad: 'kucuk', parmakizi: '0000000000000000', puan: 1 },
      { ad: 'buyuk', parmakizi: '0000000000000001', puan: 5 },
      { ad: 'baska', parmakizi: 'ffffffffffffffff', puan: 1 },
    ];
    const elenen = kopyalariBul(liste, (x) => x.puan);
    expect([...elenen].map((x) => x.ad)).toEqual(['kucuk']);
  });
});
