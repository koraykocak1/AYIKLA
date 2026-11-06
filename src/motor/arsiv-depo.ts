import { randomBytes } from 'node:crypto';
import { mkdir, rename, rm, stat } from 'node:fs/promises';
import { hostname } from 'node:os';
import { basename, extname, join } from 'node:path';
import type { Arsiv } from './arsiv';
import { dosyaOzeti, geciciyeKopyala, icindeMi, type AktarmaKancalari } from './disari-aktar';
import { turBul } from './tarayici';
import type { MedyaTuru } from './tipler';

/**
 * İçerik adresli içe aktarma (FAZ 1 #6). Her farklı içerik arşivde bir kez durur:
 * `medya/<sha256[0:2]>/<sha256>.<uzantı>`. Aynı baytlar iki farklı kaynaktan gelirse tek fiziksel
 * kopya (blob) ve tek öğe olur; öğenin altında iki kaynak yolu (köken) kaydedilir.
 *
 * Bu ilk aşamadır (kopya + özet). Tarih, önizleme ve yapay zekâ sonra, ayrı aşamalarda eklenir (`oge.asama`).
 * Kaynak dosyalar yalnız okunur.
 */

const GECICI_UZANTI = '.ayikla-gecici';
const DENEME_SAYISI = 2;

export interface IceAlinacak {
  yol: string;
  tur?: MedyaTuru;
  tarih?: string; // ISO; bilinmiyorsa dosyanın değişme tarihi kullanılır
}

/** `yeni`: yeni öğe oluştu · `tekil`: içerik zaten vardı, yalnız kaynak yolu eklendi · `kayitli`: bu yol zaten kayıtlı. */
export type IceAlmaDurumu = 'yeni' | 'tekil' | 'kayitli';

export interface IceAlmaSonucu {
  /** Kullanıcı durdurduysa true; o ana kadar alınanlar kayıtlıdır, kalanlara dokunulmamıştır. */
  durduruldu: boolean;
  yeni: number;
  tekil: number;
  kayitli: number;
  ogeler: { yol: string; ogeId: number; sha256: string; durum: IceAlmaDurumu }[];
  hatalar: { yol: string; hata: string }[];
}

export interface BlobSatiri {
  sha256: string;
  boyut: number;
  yol_goreli: string;
  ref_sayisi: number;
  eklenme: string;
}

export interface OgeSatiri {
  id: number;
  blob_sha256: string;
  ad_orijinal: string;
  tur: MedyaTuru;
  tarih: string | null;
  eklenme: string;
  silinme: string | null;
  asama: string;
}

export interface KaynakYoluSatiri {
  oge_id: number;
  yol: string;
  boyut: number;
  mtime: number;
  cihaz: string;
  ilk_gorulme: string;
  son_gorulme: string;
}

/** Blobun arşiv köküne göre yolu (her zaman `/` ile; Windows'ta da). */
export function blobGoreliYolu(sha256: string, uzanti: string): string {
  return `medya/${sha256.slice(0, 2)}/${sha256}${uzanti.toLowerCase()}`;
}

export function blobYolu(a: Arsiv, b: Pick<BlobSatiri, 'yol_goreli'>): string {
  return join(a.kok, ...b.yol_goreli.split('/'));
}

export function blobAl(a: Arsiv, sha256: string): BlobSatiri | undefined {
  return a.vt.prepare('SELECT * FROM blob WHERE sha256 = ?').get(sha256) as BlobSatiri | undefined;
}

export function ogeAl(a: Arsiv, id: number): OgeSatiri | undefined {
  return a.vt.prepare('SELECT * FROM oge WHERE id = ?').get(id) as OgeSatiri | undefined;
}

export function kaynakYollari(a: Arsiv, ogeId: number): KaynakYoluSatiri[] {
  return a.vt.prepare('SELECT * FROM kaynak_yolu WHERE oge_id = ? ORDER BY ilk_gorulme, yol').all(ogeId) as KaynakYoluSatiri[];
}

/**
 * Blobu yerine koyar: geçici dosyaya kopyala → kaynak değişmedi mi bak → kopyanın SHA-256'sı beklenene
 * eşit mi bak → içerik adına taşı. Hedefte (kayıtsız, ör. çökmeden kalmış) aynı içerik varsa yeniden kopyalamaz;
 * içeriği farklıysa (bozuk) silmez, `.bozuk-<zaman>` olarak kenara alır.
 */
async function blobYerlestir(
  a: Arsiv,
  kaynak: string,
  sha256: string,
  boyut: number,
  mtimeMs: number,
  yolGoreli: string,
  kayitli: boolean,
  kanca?: AktarmaKancalari,
): Promise<void> {
  const hedef = join(a.kok, ...yolGoreli.split('/'));
  const klasor = join(hedef, '..');
  await mkdir(klasor, { recursive: true });
  const mevcut = await stat(hedef).catch(() => null);
  if (mevcut) {
    // Kayıtlı blob yerindeyse yeniden okunmaz; sessiz bozulmayı sağlık denetimi (FAZ 1 #10) yakalar.
    if (mevcut.size === boyut && (kayitli || (await dosyaOzeti(hedef)) === sha256)) return;
    await rename(hedef, `${hedef}.bozuk-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  }
  let sonHata = '';
  for (let deneme = 1; deneme <= DENEME_SAYISI; deneme++) {
    const gecici = join(klasor, `.${sha256}.${randomBytes(4).toString('hex')}${GECICI_UZANTI}`);
    try {
      const okunan = await geciciyeKopyala(kaynak, gecici);
      await kanca?.kopyadanSonra?.(kaynak, gecici);
      const sonra = await stat(kaynak);
      if (sonra.size !== boyut || sonra.mtimeMs !== mtimeMs || okunan !== sha256) {
        sonHata = 'Kopyalanırken kaynak dosya değişti';
        continue;
      }
      if ((await dosyaOzeti(gecici)) !== sha256) {
        sonHata = 'Kopya doğrulanamadı (SHA-256 uyuşmadı)';
        continue;
      }
      await rename(gecici, hedef);
      return;
    } finally {
      await rm(gecici, { force: true });
    }
  }
  throw new Error(`${sonHata} (${DENEME_SAYISI} deneme)`);
}

/**
 * Dosyaları arşive alır. Aynı içerik bir kez kopyalanır (SHA-256 ile birebir tekilleştirme); her kaynak yolu
 * köken olarak kaydedilir. Arşivin kendi içinden dosya alınmaz. Disk dolarsa ya da `durdur` tetiklenirse
 * sıradaki dosyaya geçmeden durur; her dosya kendi transaction'ında kaydedildiği için yarım kayıt kalmaz.
 */
export async function iceAl(
  a: Arsiv,
  dosyalar: IceAlinacak[],
  /** Üçüncü değer o ana kadarki sayımlar (yeni / tekil / kayıtlı): "kaçı zaten arşivde" göstermek için. */
  ilerleme?: (bitti: number, toplam: number, ara: Readonly<IceAlmaSonucu>) => void,
  kanca?: AktarmaKancalari,
  durdur?: AbortSignal,
): Promise<IceAlmaSonucu> {
  const sonuc: IceAlmaSonucu = { durduruldu: false, yeni: 0, tekil: 0, kayitli: 0, ogeler: [], hatalar: [] };
  const cihaz = hostname();
  const blobEkle = a.vt.prepare(
    'INSERT INTO blob (sha256, boyut, yol_goreli, ref_sayisi, eklenme) VALUES (?, ?, ?, 0, ?) ON CONFLICT(sha256) DO NOTHING',
  );
  const canliOge = a.vt.prepare('SELECT id FROM oge WHERE blob_sha256 = ? AND silinme IS NULL ORDER BY id LIMIT 1');
  const ogeEkle = a.vt.prepare('INSERT INTO oge (blob_sha256, ad_orijinal, tur, tarih, eklenme) VALUES (?, ?, ?, ?, ?)');
  const refArtir = a.vt.prepare('UPDATE blob SET ref_sayisi = ref_sayisi + 1 WHERE sha256 = ?');
  const yolVar = a.vt.prepare('SELECT 1 FROM kaynak_yolu WHERE oge_id = ? AND yol = ?');
  const yolYaz = a.vt.prepare(`
    INSERT INTO kaynak_yolu (oge_id, yol, boyut, mtime, cihaz, ilk_gorulme, son_gorulme) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(oge_id, yol) DO UPDATE SET boyut = excluded.boyut, mtime = excluded.mtime, cihaz = excluded.cihaz,
      son_gorulme = excluded.son_gorulme`);

  for (let i = 0; i < dosyalar.length; i++) {
    if (durdur?.aborted) {
      sonuc.durduruldu = true;
      break;
    }
    const d = dosyalar[i];
    try {
      if (icindeMi(d.yol, a.kok)) throw new Error('Bu dosya zaten arşivin içinde');
      const tur = d.tur ?? turBul(d.yol);
      if (!tur) throw new Error('Desteklenmeyen dosya türü');
      const st = await stat(d.yol);
      const sha256 = await dosyaOzeti(d.yol);
      const kayitliBlob = blobAl(a, sha256);
      const yolGoreli = kayitliBlob?.yol_goreli ?? blobGoreliYolu(sha256, extname(d.yol));
      // Kayıt varken dosya silinmişse yeniden konur; kayıtsız (çökmeden kalmış) dosya özetle doğrulanır.
      await blobYerlestir(a, d.yol, sha256, st.size, st.mtimeMs, yolGoreli, !!kayitliBlob, kanca);

      const simdi = new Date().toISOString();
      const { ogeId, durum } = a.vt.transaction(() => {
        blobEkle.run(sha256, st.size, yolGoreli, simdi);
        let id = (canliOge.get(sha256) as { id: number } | undefined)?.id;
        let durum: IceAlmaDurumu;
        if (id === undefined) {
          const ad = basename(d.yol).normalize('NFC');
          const tarih = d.tarih ?? new Date(st.mtimeMs).toISOString();
          id = Number(ogeEkle.run(sha256, ad, tur, tarih, simdi).lastInsertRowid);
          refArtir.run(sha256);
          durum = 'yeni';
        } else {
          durum = yolVar.get(id, d.yol) ? 'kayitli' : 'tekil';
        }
        yolYaz.run(id, d.yol, st.size, st.mtimeMs, cihaz, simdi, simdi);
        return { ogeId: id, durum };
      })();
      sonuc[durum]++;
      sonuc.ogeler.push({ yol: d.yol, ogeId, sha256, durum });
    } catch (h) {
      sonuc.hatalar.push({ yol: d.yol, hata: h instanceof Error ? h.message : String(h) });
      if ((h as NodeJS.ErrnoException).code === 'ENOSPC') break;
    }
    ilerleme?.(i + 1, dosyalar.length, sonuc);
  }
  return sonuc;
}
