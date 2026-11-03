import { readdir, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import type { Arsiv } from './arsiv';
import { blobYolu, type BlobSatiri } from './arsiv-depo';
import { dosyaOzeti } from './disari-aktar';

/**
 * Arşiv sağlık denetimi (FAZ 1 #10). Kayıtlı SHA-256'larla diskteki dosyaları karşılaştırır.
 * Yalnız okur: hiçbir dosyayı onarmaz, taşımaz, silmez. Sonucun özetini katalogdaki `meta` tablosuna yazar.
 * Düşük öncelikte çalışabilir (`bekleme`: her dosyadan sonra kısa ara) ve durdurulabilir (`durdur`).
 */

export const SAGLIK_META_ANAHTARI = 'son_saglik_denetimi';

export interface SaglikRaporu {
  zaman: string; // ISO, başlangıç
  bitti: boolean; // false: durduruldu
  denetlenen: number;
  saglam: number;
  degismis: string[]; // boyutu ya da özeti kayıtla uyuşmayan blob (köke göre yol)
  eksik: string[]; // kaydı var, dosyası yok
  kayitsiz: string[]; // `medya/` içinde kaydı olmayan dosya (ör. yarım kalmış kopya, kenara alınmış bozuk dosya)
  refHatali: { sha256: string; kayitli: number; gercek: number }[];
  katalog: string; // `PRAGMA quick_check` sonucu ("ok" beklenir)
}

export interface SaglikSecenekleri {
  ilerleme?: (bitti: number, toplam: number) => void;
  durdur?: AbortSignal;
  /** Her dosyadan sonra beklenecek süre (ms); diski ve işlemciyi yormamak için. */
  bekleme?: number;
}

const bekle = (ms: number) => new Promise((coz) => setTimeout(coz, ms));

async function medyaDosyalari(a: Arsiv): Promise<string[]> {
  const sonuc: string[] = [];
  let girdiler;
  try {
    girdiler = await readdir(a.yol('medya'), { withFileTypes: true, recursive: true });
  } catch {
    return sonuc;
  }
  for (const g of girdiler) {
    if (g.isFile()) sonuc.push(relative(a.kok, join(g.parentPath, g.name)).split(sep).join('/'));
  }
  return sonuc;
}

export async function saglikDenetimi(a: Arsiv, s: SaglikSecenekleri = {}): Promise<SaglikRaporu> {
  const rapor: SaglikRaporu = {
    zaman: new Date().toISOString(),
    bitti: false,
    denetlenen: 0,
    saglam: 0,
    degismis: [],
    eksik: [],
    kayitsiz: [],
    refHatali: [],
    katalog: String(a.vt.pragma('quick_check', { simple: true })),
  };

  rapor.refHatali = a.vt
    .prepare(
      `SELECT b.sha256, b.ref_sayisi AS kayitli, COUNT(o.id) AS gercek FROM blob b LEFT JOIN oge o ON o.blob_sha256 = b.sha256
       GROUP BY b.sha256 HAVING b.ref_sayisi != COUNT(o.id)`,
    )
    .all() as SaglikRaporu['refHatali'];

  const bloblar = a.vt.prepare('SELECT * FROM blob ORDER BY sha256').all() as BlobSatiri[];
  const kayitli = new Set(bloblar.map((b) => b.yol_goreli));
  for (const d of await medyaDosyalari(a)) if (!kayitli.has(d)) rapor.kayitsiz.push(d);

  for (let i = 0; i < bloblar.length; i++) {
    if (s.durdur?.aborted) break;
    const b = bloblar[i];
    const yol = blobYolu(a, b);
    const st = await stat(yol).catch(() => null);
    if (!st) rapor.eksik.push(b.yol_goreli);
    else if (st.size !== b.boyut || (await dosyaOzeti(yol)) !== b.sha256) rapor.degismis.push(b.yol_goreli);
    else rapor.saglam++;
    rapor.denetlenen++;
    s.ilerleme?.(i + 1, bloblar.length);
    if (s.bekleme) await bekle(s.bekleme);
  }
  rapor.bitti = rapor.denetlenen === bloblar.length;

  a.vt
    .prepare('INSERT INTO meta (anahtar, deger) VALUES (?, ?) ON CONFLICT(anahtar) DO UPDATE SET deger = excluded.deger')
    .run(SAGLIK_META_ANAHTARI, JSON.stringify(rapor));
  return rapor;
}

/** Son denetimin raporu (yoksa null). */
export function sonSaglikRaporu(a: Arsiv): SaglikRaporu | null {
  const r = a.vt.prepare('SELECT deger FROM meta WHERE anahtar = ?').get(SAGLIK_META_ANAHTARI) as { deger: string } | undefined;
  return r ? (JSON.parse(r.deger) as SaglikRaporu) : null;
}
