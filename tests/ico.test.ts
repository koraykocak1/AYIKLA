import { describe, it, expect } from 'vitest';
import { icoYap } from '../src/ana/ico';

describe('ico', () => {
  it('PNG’yi tek resimli ico başlığıyla sarar', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
    const ico = icoYap(png, 256);
    expect(ico.length).toBe(22 + png.length);
    expect(ico.readUInt16LE(2)).toBe(1); // tür: simge
    expect(ico.readUInt16LE(4)).toBe(1); // resim sayısı
    expect(ico[6]).toBe(0); // 256 → 0
    expect(ico.readUInt32LE(14)).toBe(png.length);
    expect(ico.readUInt32LE(18)).toBe(22);
    expect(ico.subarray(22).equals(png)).toBe(true);
  });
});
