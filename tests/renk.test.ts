import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { ortalamaRenk } from '../src/motor/renk';
import { geciciKlasor, desenliResim } from './yardimci';

describe('renk', () => {
  it('küçük resmin ortalama rengini #rrggbb olarak verir', async () => {
    const k = await geciciKlasor();
    const f = join(k, 'k.jpg');
    await desenliResim(f, { renk: [220, 40, 40], tohum: 1 });
    const r = await ortalamaRenk(f);
    expect(r).toMatch(/^#[0-9a-f]{6}$/);
    const [kirmizi, yesil] = [parseInt(r.slice(1, 3), 16), parseInt(r.slice(3, 5), 16)];
    expect(kirmizi).toBeGreaterThan(yesil + 100);
  });

  it('okunamayan dosyada gri döner', async () => {
    expect(await ortalamaRenk('C:/yok/yok.jpg')).toBe('#808080');
  });
});
