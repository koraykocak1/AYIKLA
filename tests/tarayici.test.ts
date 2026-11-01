import { describe, it, expect } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tara, turBul } from '../src/motor/tarayici';
import { geciciKlasor } from './yardimci';

describe('tarayici', () => {
  it('uzantıdan türü bulur', () => {
    expect(turBul('a/IMG_1.JPG')).toBe('foto');
    expect(turBul('a/b.heic')).toBe('foto');
    expect(turBul('a/v.MOV')).toBe('video');
    expect(turBul('a/not.txt')).toBeNull();
  });

  it('alt klasörler dahil medyayı bulur, gizli ve diğer dosyaları atlar', async () => {
    const k = await geciciKlasor();
    await mkdir(join(k, 'alt'));
    await mkdir(join(k, '.gizli'));
    await writeFile(join(k, 'a.jpg'), 'x');
    await writeFile(join(k, 'alt', 'b.mp4'), 'xy');
    await writeFile(join(k, 'not.txt'), 'x');
    await writeFile(join(k, '.gizli', 'c.jpg'), 'x');
    const sonuc = await tara([k]);
    expect(sonuc.map((d) => d.tur)).toEqual(['foto', 'video']);
    expect(sonuc[1].boyut).toBe(2);
  });

  it('aynı dosya iki kez verilirse bir kez sayar; tek dosya da kabul eder', async () => {
    const k = await geciciKlasor();
    await writeFile(join(k, 'a.jpg'), 'x');
    const sonuc = await tara([k, join(k, 'a.jpg')]);
    expect(sonuc).toHaveLength(1);
  });
});
