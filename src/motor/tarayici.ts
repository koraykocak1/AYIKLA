import { lstat, readdir, stat } from 'node:fs/promises';
import { join, extname, basename, dirname, parse } from 'node:path';
import { HAM_UZANTILARI, hamMi } from './ham';
import { ARSIV_ISARETI, icindeMi } from './disari-aktar';
import type { MedyaDosyasi, MedyaTuru } from './tipler';

const FOTO = new Set(['.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp', ...HAM_UZANTILARI]);
const VIDEO = new Set(['.mp4', '.mov', '.3gp', '.m4v', '.avi']);

export function turBul(yol: string): MedyaTuru | null {
  const e = extname(yol).toLowerCase();
  if (FOTO.has(e)) return 'foto';
  if (VIDEO.has(e)) return 'video';
  return null;
}

/** Hiçbir yerde taranmayan Windows sistem klasörleri ve uygulama verileri (önbellek resimleri vb.). */
const SISTEM_KLASORLERI = new Set(['$recycle.bin', 'system volume information', '$windows.~bt', '$windows.~ws', 'appdata']);
/** Yalnız sürücü kökündeyse (C:\Windows gibi) atlanan klasörler. */
const KOK_SISTEM_KLASORLERI = new Set(['windows', 'program files', 'program files (x86)', 'programdata']);

export interface TaramaSecenekleri {
  /** Taranmayacak klasörler (ör. AYIKLA'nın çalışma klasörü). */
  haric?: string[];
}

async function varMi(yol: string): Promise<boolean> {
  try {
    await stat(yol);
    return true;
  } catch {
    return false;
  }
}

/**
 * Alt klasöre girilmeli mi? Sistem klasörleri, hariç tutulanlar ve AYIKLA'nın kendi dışa aktarma
 * klasörleri (köklerinde `.ayikla-arsiv` işareti olan) atlanır: program kendi kopyalarını kaynak sanmasın.
 * Kullanıcının doğrudan seçtiği klasör bu kurallardan muaftır.
 */
async function klasoreGirilir(yol: string, haric: string[]): Promise<boolean> {
  const ad = basename(yol).toLowerCase();
  if (SISTEM_KLASORLERI.has(ad)) return false;
  if (KOK_SISTEM_KLASORLERI.has(ad) && dirname(yol) === parse(yol).root) return false;
  if (haric.some((h) => icindeMi(yol, h))) return false;
  return !(await varMi(join(yol, ARSIV_ISARETI)));
}

export async function tara(girdiler: string[], secenek: TaramaSecenekleri = {}): Promise<MedyaDosyasi[]> {
  const sonuc: MedyaDosyasi[] = [];
  const gorulen = new Set<string>();
  const haric = secenek.haric ?? [];

  async function gez(yol: string, kok: boolean): Promise<void> {
    if (basename(yol).startsWith('.')) return;
    let s;
    try {
      // Alt öğelerde bağlantılar (kısayol klasörü, junction) izlenmez: döngü ve başka diske taşma olmasın.
      s = kok ? await stat(yol) : await lstat(yol);
    } catch {
      return;
    }
    if (s.isSymbolicLink()) return;
    if (s.isDirectory()) {
      if (!kok && !(await klasoreGirilir(yol, haric))) return;
      let ogeler: string[];
      try {
        ogeler = await readdir(yol);
      } catch {
        return; // izin verilmeyen klasör tüm taramayı durdurmaz
      }
      for (const oge of ogeler) await gez(join(yol, oge), false);
      return;
    }
    const tur = turBul(yol);
    if (!tur || gorulen.has(yol)) return;
    gorulen.add(yol);
    sonuc.push({ yol, tur, boyut: s.size, degisme: s.mtimeMs });
  }

  for (const g of girdiler) await gez(g, true);
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
