import { describe, it, expect } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tara, turBul, hamEsleriniAyir } from '../src/motor/tarayici';
import { geciciKlasor } from './yardimci';

describe('tarayici', () => {
  it('uzantıdan türü bulur', () => {
    expect(turBul('a/IMG_1.JPG')).toBe('foto');
    expect(turBul('a/b.heic')).toBe('foto');
    expect(turBul('a/v.MOV')).toBe('video');
    expect(turBul('a/not.txt')).toBeNull();
    expect(turBul('a/_DSC1.NEF')).toBe('foto');
    expect(turBul('a/SDC1.AVI')).toBe('video');
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

  it('aynı klasörde aynı adlı JPG’si olan NEF işlenmez, JPG’ye RAW eşi olarak bağlanır', () => {
    const d = (yol: string) => ({ yol, tur: 'foto' as const, boyut: 1, degisme: 1 });
    const jpg = join('D:', 'a', '_DSC1.JPG');
    const es = join('D:', 'a', '_dsc1.nef');
    const yalniz = join('D:', 'a', '_DSC2.NEF');
    const baskaKlasor = join('D:', 'b', '_DSC1.NEF');
    const r = hamEsleriniAyir([d(jpg), d(es), d(yalniz), d(baskaKlasor)]);
    expect(r.islenecek.map((x) => x.yol)).toEqual([jpg, yalniz, baskaKlasor]);
    expect(r.esler.get(jpg)).toEqual([es]);
    expect(r.esler.size).toBe(1);
  });

  it('aynı dosya iki kez verilirse bir kez sayar; tek dosya da kabul eder', async () => {
    const k = await geciciKlasor();
    await writeFile(join(k, 'a.jpg'), 'x');
    const sonuc = await tara([k, join(k, 'a.jpg')]);
    expect(sonuc).toHaveLength(1);
  });
});
