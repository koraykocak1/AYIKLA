import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { Arsiv } from './arsiv';
import { blobYolu, type BlobSatiri, type OgeSatiri } from './arsiv-depo';
import { icindeMi } from './disari-aktar';

/**
 * Geri dönüşüm kutusu (FAZ 1 #7). Ayrı işlemler, birbirine karışmaz:
 *
 * - Kutuya taşı ("sil"): öğe gizlenir, `oge.silinme` yazılır; dosya yerinde kalır, 30 gün geri alınabilir.
 * - Kalıcı sil: yalnız kutudaki öğe için. Öğe kaydı silinir, blobun `ref_sayisi` azalır; dosya yalnız onu
 *   kullanan başka öğe kalmadıysa silinir (paylaşılan blob korunur).
 * - Albümden kaldır (FAZ 1 #8) bunların hiçbiri değildir: öğe arşivde kalır.
 *
 * Kaynak dosyalara hiçbir durumda dokunulmaz: silinen her dosya arşivin `medya/` klasörünün içindedir.
 */

export const KUTU_GUN = 30;
const GUN_MS = 24 * 60 * 60 * 1000;

function yerTutucu(n: number): string {
  return Array.from({ length: n }, () => '?').join(',');
}

/** Öğeleri kutuya taşır. Zaten kutuda olanlar değişmez. Taşınan öğe sayısını döndürür. */
export function kutuyaTasi(a: Arsiv, ogeIdler: number[], simdi = new Date()): number {
  if (!ogeIdler.length) return 0;
  return a.vt
    .prepare(`UPDATE oge SET silinme = ? WHERE silinme IS NULL AND id IN (${yerTutucu(ogeIdler.length)})`)
    .run(simdi.toISOString(), ...ogeIdler).changes;
}

/** Kutudaki öğeler, en son silinen başta. */
export function kutudakiler(a: Arsiv): OgeSatiri[] {
  return a.vt.prepare('SELECT * FROM oge WHERE silinme IS NOT NULL ORDER BY silinme DESC, id DESC').all() as OgeSatiri[];
}

/** Kutudaki öğenin kendiliğinden kalıcı silinebileceği tarih. */
export function kaliciSilinmeTarihi(o: Pick<OgeSatiri, 'silinme'>, gun = KUTU_GUN): Date | null {
  return o.silinme ? new Date(Date.parse(o.silinme) + gun * GUN_MS) : null;
}

/**
 * Kutudaki öğeleri geri alır. Aynı içerik bu arada yeniden içe alınmışsa (canlı bir öğe varsa) iki öğe olmaz:
 * kutudaki öğenin kaynak yolları canlı öğeye taşınır ve kutudaki kayıt kapanır. Geri alınan (ya da birleşilen)
 * öğe kimliklerini döndürür.
 */
export function kutudanGeriAl(a: Arsiv, ogeIdler: number[]): number[] {
  const ogeAl = a.vt.prepare('SELECT * FROM oge WHERE id = ? AND silinme IS NOT NULL');
  const canli = a.vt.prepare('SELECT id FROM oge WHERE blob_sha256 = ? AND silinme IS NULL ORDER BY id LIMIT 1');
  const geriAl = a.vt.prepare('UPDATE oge SET silinme = NULL WHERE id = ?');
  const yollariTasi = a.vt.prepare(`
    INSERT INTO kaynak_yolu (oge_id, yol, boyut, mtime, cihaz, ilk_gorulme, son_gorulme)
    SELECT ?, yol, boyut, mtime, cihaz, ilk_gorulme, son_gorulme FROM kaynak_yolu WHERE oge_id = ?
    ON CONFLICT(oge_id, yol) DO UPDATE SET ilk_gorulme = MIN(ilk_gorulme, excluded.ilk_gorulme)`);
  // Albüm ve etiket bağları da canlı öğeye geçer (FAZ 1 #8).
  const albumleriTasi = a.vt.prepare(
    'INSERT OR IGNORE INTO album_oge (album_id, oge_id, eklenme) SELECT album_id, ?, eklenme FROM album_oge WHERE oge_id = ?',
  );
  const etiketleriTasi = a.vt.prepare(
    'INSERT OR IGNORE INTO oge_etiket (oge_id, etiket_id, kaynak, eklenme) SELECT ?, etiket_id, kaynak, eklenme FROM oge_etiket WHERE oge_id = ?',
  );
  const ogeSil = a.vt.prepare('DELETE FROM oge WHERE id = ?');
  const refAzalt = a.vt.prepare('UPDATE blob SET ref_sayisi = ref_sayisi - 1 WHERE sha256 = ?');

  return a.vt.transaction(() => {
    const sonuc: number[] = [];
    for (const id of ogeIdler) {
      const o = ogeAl.get(id) as OgeSatiri | undefined;
      if (!o) continue;
      const hedef = (canli.get(o.blob_sha256) as { id: number } | undefined)?.id;
      if (hedef === undefined) {
        geriAl.run(id);
        sonuc.push(id);
        continue;
      }
      yollariTasi.run(hedef, id);
      albumleriTasi.run(hedef, id);
      etiketleriTasi.run(hedef, id);
      ogeSil.run(id);
      refAzalt.run(o.blob_sha256);
      sonuc.push(hedef);
    }
    return sonuc;
  })();
}

export interface KaliciSilmeSonucu {
  silinenOge: number;
  silinenDosya: number;
  korunanDosya: number; // başka öğe de kullandığı için silinmeyen blob
  hatalar: { yol: string; hata: string }[];
}

/**
 * Yalnız kutudaki öğeleri kalıcı siler. Önce katalog (tek transaction), sonra dosyalar: dosya silinemezse
 * katalogda kaydı olmayan bir dosya kalır (sağlık denetimi bulur), ama kaydı olup dosyası olmayan öğe oluşmaz.
 */
export async function kaliciSil(a: Arsiv, ogeIdler: number[]): Promise<KaliciSilmeSonucu> {
  const sonuc: KaliciSilmeSonucu = { silinenOge: 0, silinenDosya: 0, korunanDosya: 0, hatalar: [] };
  const ogeAl = a.vt.prepare('SELECT * FROM oge WHERE id = ? AND silinme IS NOT NULL');
  const ogeSil = a.vt.prepare('DELETE FROM oge WHERE id = ?');
  const refAzalt = a.vt.prepare('UPDATE blob SET ref_sayisi = ref_sayisi - 1 WHERE sha256 = ?');
  const blobAl = a.vt.prepare('SELECT * FROM blob WHERE sha256 = ?');
  const blobSil = a.vt.prepare('DELETE FROM blob WHERE sha256 = ?');

  const silinecekler = a.vt.transaction(() => {
    const dosyalar: BlobSatiri[] = [];
    const bakilan = new Set<string>();
    for (const id of ogeIdler) {
      const o = ogeAl.get(id) as OgeSatiri | undefined;
      if (!o) continue; // kutuda değil ya da yok: kalıcı silinmez
      ogeSil.run(id);
      refAzalt.run(o.blob_sha256);
      sonuc.silinenOge++;
      bakilan.add(o.blob_sha256);
    }
    for (const sha of bakilan) {
      const b = blobAl.get(sha) as BlobSatiri;
      if (b.ref_sayisi > 0) {
        sonuc.korunanDosya++;
        continue;
      }
      blobSil.run(sha);
      dosyalar.push(b);
    }
    return dosyalar;
  })();

  const medya = join(a.kok, 'medya');
  for (const b of silinecekler) {
    const yol = blobYolu(a, b);
    try {
      if (!icindeMi(yol, medya)) throw new Error('Arşivin medya klasörü dışındaki dosya silinmez');
      await rm(yol, { force: true });
      sonuc.silinenDosya++;
    } catch (h) {
      sonuc.hatalar.push({ yol, hata: h instanceof Error ? h.message : String(h) });
    }
  }
  return sonuc;
}

/** Kutuda `gun` günden uzun duran öğeleri kalıcı siler. */
export async function kutuyuBosalt(a: Arsiv, simdi = new Date(), gun = KUTU_GUN): Promise<KaliciSilmeSonucu> {
  const sinir = new Date(simdi.getTime() - gun * GUN_MS).toISOString();
  const idler = (a.vt.prepare('SELECT id FROM oge WHERE silinme IS NOT NULL AND silinme <= ?').all(sinir) as { id: number }[]).map(
    (r) => r.id,
  );
  return kaliciSil(a, idler);
}
