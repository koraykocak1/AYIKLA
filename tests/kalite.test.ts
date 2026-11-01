import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { kaliteOlc } from '../src/motor/kalite';
import { geciciKlasor, desenliResim, bulanikResim, karanlikResim } from './yardimci';

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

  it('karanlık resmi yakalar, bulanık demez', async () => {
    const k = await geciciKlasor();
    const f = join(k, 'k.jpg');
    await karanlikResim(f);
    const q = await kaliteOlc(f);
    expect(q.karanlik).toBe(true);
    expect(q.bulanik).toBe(false);
  });
});
