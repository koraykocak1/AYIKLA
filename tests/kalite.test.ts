import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { kaliteOlc } from '../src/motor/kalite';
import { geciciKlasor, desenliResim, bulanikResim, karanlikResim, geceResmi } from './yardimci';

describe('kalite', () => {
  it('net resmi net sayar', async () => {
    const k = await geciciKlasor();
    const f = join(k, 'n.jpg');
    await desenliResim(f, { renk: [120, 130, 140], tohum: 3 });
    const q = await kaliteOlc(f);
    expect(q.bulanik).toBe(false);
    expect(q.karanlik).toBe(false);
  });

  it('bulanık resmi yakalar', async () => {
    const k = await geciciKlasor();
    const f = join(k, 'b.jpg');
    await bulanikResim(f, 3);
    const q = await kaliteOlc(f);
    expect(q.bulanik).toBe(true);
    expect(q.karanlik).toBe(false);
  });

  it('ortalaması karanlık ama ışıkları ve aydınlık bir konusu olan gece fotoğrafını elemez', async () => {
    const k = await geciciKlasor();
    const f = join(k, 'g.jpg');
    await geceResmi(f);
    const q = await kaliteOlc(f);
    expect(q.parlaklik).toBeLessThan(28); // eski kurala göre "karanlık" olurdu
    expect(q.aydinlik).toBeGreaterThanOrEqual(60);
    expect(q.karanlik).toBe(false);
    expect(q.bulanik).toBe(false);
  });

  it('karanlık resmi yakalar, bulanık demez', async () => {
    const k = await geciciKlasor();
    const f = join(k, 'k.jpg');
    await karanlikResim(f);
    const q = await kaliteOlc(f);
    expect(q.karanlik).toBe(true);
    expect(q.bulanik).toBe(false);
  });
});
