import { readdir, stat } from 'node:fs/promises';
import { join, extname, basename, dirname } from 'node:path';
import { HAM_UZANTILARI, hamMi } from './ham';
import type { MedyaDosyasi, MedyaTuru } from './tipler';

const FOTO = new Set(['.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp', ...HAM_UZANTILARI]);
const VIDEO = new Set(['.mp4', '.mov', '.3gp', '.m4v', '.avi']);

export function turBul(yol: string): MedyaTuru | null {
  const e = extname(yol).toLowerCase();
  if (FOTO.has(e)) return 'foto';
  if (VIDEO.has(e)) return 'video';
  return null;
}

export async function tara(girdiler: string[]): Promise<MedyaDosyasi[]> {
  const sonuc: MedyaDosyasi[] = [];
  const gorulen = new Set<string>();

  async function gez(yol: string): Promise<void> {
    if (basename(yol).startsWith('.')) return;
    let s;
    try {
      s = await stat(yol);
    } catch {
      return;
    }
    if (s.isDirectory()) {
      for (const oge of await readdir(yol)) await gez(join(yol, oge));
      return;
    }
    const tur = turBul(yol);
    if (!tur || gorulen.has(yol)) return;
    gorulen.add(yol);
    sonuc.push({ yol, tur, boyut: s.size, degisme: s.mtimeMs });
  }

  for (const g of girdiler) await gez(g);
  return sonuc.sort((a, b) => a.yol.localeCompare(b.yol));
}

/**
 * Fotoğraf makinesi aynı kareyi hem JPG hem RAW (NEF) olarak kaydeder. Aynı klasörde aynı adlı JPG'si
 * olan NEF ayrıca işlenmez (aynı fotoğraf iki kez görünmesin); JPG'ye "RAW eşi" olarak bağlanır ve
 * dışa aktarırken JPG'nin yanına kopyalanır. Eşi olmayan NEF normal fotoğraf gibi işlenir.
 */
export function hamEsleriniAyir(dosyalar: MedyaDosyasi[]): { islenecek: MedyaDosyasi[]; esler: Map<string, string[]> } {
  const anahtar = (y: string) => join(dirname(y), basename(y, extname(y))).toLowerCase();
  const fotolar = new Map<string, string>();
  for (const d of dosyalar) if (d.tur === 'foto' && !hamMi(d.yol)) fotolar.set(anahtar(d.yol), d.yol);
  const islenecek: MedyaDosyasi[] = [];
  const esler = new Map<string, string[]>();
  for (const d of dosyalar) {
    const es = hamMi(d.yol) ? fotolar.get(anahtar(d.yol)) : undefined;
    if (es) esler.set(es, [...(esler.get(es) ?? []), d.yol]);
    else islenecek.push(d);
  }
  return { islenecek, esler };
}
