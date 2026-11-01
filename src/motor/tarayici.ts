import { readdir, stat } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import type { MedyaDosyasi, MedyaTuru } from './tipler';

const FOTO = new Set(['.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp']);
const VIDEO = new Set(['.mp4', '.mov', '.3gp', '.m4v']);

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
