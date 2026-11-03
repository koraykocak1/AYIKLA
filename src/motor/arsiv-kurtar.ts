import { existsSync, type Dirent } from 'node:fs';
import { readdir, rename, stat } from 'node:fs/promises';
import { basename, join, relative, sep } from 'node:path';
import { ARSIV_KATALOGU, arsivKimligiOku, kilitAl } from './arsiv';
import { dosyaOzeti } from './disari-aktar';
import { veritabaniAc } from './katalog';
import { turBul } from './tarayici';

/**
 * Katalog kaybında kurtarma (FAZ 1 #12, madde 124'ün ilk parçası).
 *
 * Arşivin kataloğu kaybolmuş ya da bozulmuşsa `medya/` içindeki dosyalardan yeni bir katalog kurar:
 * her dosyanın adındaki SHA-256 yeniden hesaplanır; tutanlar kataloğa alınır, tutmayanlar dokunulmadan raporlanır.
 * Bozuk katalog silinmez, `.bozuk-<zaman>` olarak kenara alınır. Medya dosyalarına yazılmaz.
 *
 * Dürüst sınır: albümler, etiketler, kaynak yolları, orijinal dosya adları ve kutu durumu dosyalarda saklanmadığı
 * için geri gelmez; rapor bunu açıkça söyler. Bunlar için yedekten geri yükleme (`arsiv-yedek.ts`) gerekir.
 */

export const KURTARILAMAYAN_BILGILER = [
  'albümler',
  'etiketler',
  'kaynak yolları (köken)',
  'orijinal dosya adları',
  'kutudaki öğelerin kutu durumu',
  'çekim tarihi (dosya tarihi kullanıldı)',
] as const;

export interface KurtarmaRaporu {
  zaman: string;
  kenaraAlinan: string | null; // bozuk katalog nereye taşındı
  kurtarilan: number;
  bozuk: string[]; // adındaki özetle içeriği uyuşmayan dosya (dokunulmadı)
  tanimsiz: string[]; // içerik adresi biçiminde olmayan dosya (dokunulmadı)
  kurtarilamayan: readonly string[];
}

const ICERIK_ADI = /^medya\/([0-9a-f]{2})\/([0-9a-f]{64})(\.[^/.]+)?$/;

/** Katalog var ve açılabiliyor mu? (Bozuksa false.) */
export async function katalogSaglamMi(kok: string): Promise<boolean> {
  const dosya = join(kok, ARSIV_KATALOGU);
  if (!existsSync(dosya)) return false;
  try {
    const vt = await veritabaniAc(dosya);
    try {
      return vt.pragma('quick_check', { simple: true }) === 'ok';
    } finally {
      vt.close();
    }
  } catch {
    return false;
  }
}

/**
 * Arşivin kataloğunu `medya/` dosyalarından yeniden kurar. Kilidi alır (başka pencere açıksa çalışmaz).
 * Sağlam bir katalog varsa hiçbir şey yapmaz ve hata verir: kurtarma yalnız kayıp/bozuk katalog içindir.
 */
export async function katalogKurtar(kok: string, secenek: { bayatKilidiKaldir?: boolean } = {}): Promise<KurtarmaRaporu> {
  await arsivKimligiOku(kok);
  const kilit = await kilitAl(kok, secenek);
  try {
    if (await katalogSaglamMi(kok)) throw new Error('Katalog sağlam; kurtarmaya gerek yok.');
    const dosya = join(kok, ARSIV_KATALOGU);
    const rapor: KurtarmaRaporu = {
      zaman: new Date().toISOString(),
      kenaraAlinan: null,
      kurtarilan: 0,
      bozuk: [],
      tanimsiz: [],
      kurtarilamayan: KURTARILAMAYAN_BILGILER,
    };
    if (existsSync(dosya)) {
      const yedek = `${dosya}.bozuk-${rapor.zaman.replace(/[:.]/g, '-')}`;
      await rename(dosya, yedek);
      for (const yan of ['-wal', '-shm']) if (existsSync(dosya + yan)) await rename(dosya + yan, yedek + yan);
      rapor.kenaraAlinan = yedek;
    }

    const bulunan: { yolGoreli: string; sha256: string; boyut: number; mtime: number }[] = [];
    let girdiler: Dirent[];
    try {
      girdiler = await readdir(join(kok, 'medya'), { withFileTypes: true, recursive: true });
    } catch {
      girdiler = [];
    }
    for (const g of girdiler) {
      if (!g.isFile()) continue;
      const yolGoreli = relative(kok, join(g.parentPath, g.name)).split(sep).join('/');
      const e = ICERIK_ADI.exec(yolGoreli);
      if (!e || e[1] !== e[2].slice(0, 2) || !turBul(g.name)) {
        rapor.tanimsiz.push(yolGoreli);
        continue;
      }
      const tam = join(g.parentPath, g.name);
      if ((await dosyaOzeti(tam)) !== e[2]) {
        rapor.bozuk.push(yolGoreli);
        continue;
      }
      const s = await stat(tam);
      bulunan.push({ yolGoreli, sha256: e[2], boyut: s.size, mtime: s.mtimeMs });
    }

    const vt = await veritabaniAc(dosya);
    try {
      vt.transaction(() => {
        const blob = vt.prepare('INSERT INTO blob (sha256, boyut, yol_goreli, ref_sayisi, eklenme) VALUES (?, ?, ?, 1, ?)');
        const oge = vt.prepare(
          "INSERT INTO oge (blob_sha256, ad_orijinal, tur, tarih, eklenme, asama) VALUES (?, ?, ?, ?, ?, 'kurtarildi')",
        );
        for (const b of bulunan) {
          blob.run(b.sha256, b.boyut, b.yolGoreli, rapor.zaman);
          oge.run(b.sha256, basename(b.yolGoreli), turBul(b.yolGoreli) ?? 'foto', new Date(b.mtime).toISOString(), rapor.zaman);
        }
        rapor.kurtarilan = bulunan.length;
        vt.prepare("INSERT OR REPLACE INTO meta (anahtar, deger) VALUES ('katalog_kurtarma', ?)").run(JSON.stringify(rapor));
      })();
    } finally {
      vt.close();
    }
    return rapor;
  } finally {
    await kilit.birak();
  }
}
