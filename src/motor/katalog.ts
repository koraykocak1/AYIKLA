import { createHash } from 'node:crypto';
import { mkdir, readFile, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import Database from 'better-sqlite3';
import type { Grup, IslenmisMedya, MedyaDosyasi, SonArsiv } from './tipler';

/** Bellekteki katalog görüntüsü. Biçimi eski `kayit.json` ile aynıdır (geçiş kolay olsun diye). */
export interface KayitVerisi {
  surum: 1;
  medya: Record<string, IslenmisMedya>;
  kullaniciGruplari: Grup[];
  sonArsivler?: SonArsiv[];
}

export const SON_ARSIV_SINIRI = 8;
export const KATALOG_ADI = 'katalog.db';
export const ESKI_KAYIT_ADI = 'kayit.json';
/** Veritabanı şemasının sürümü (`PRAGMA user_version`). Şema değişince artar, geçişi `semaKur` yapar. */
export const SEMA_SURUMU = 1;

export function anahtarUret(d: MedyaDosyasi): string {
  return createHash('sha1').update(`${d.yol}|${d.boyut}|${Math.round(d.degisme)}`).digest('hex');
}

/**
 * Ağ paylaşımı yolu mu (`\\sunucu\paylasim\...`)? SQLite'ın kilitleri ve WAL ağ dosya sistemlerinde
 * güvenilir değildir; katalog orada açılmaz. Eşlenmiş ağ sürücüsü (ör. `Z:`) bu denetimle anlaşılmaz.
 */
export function agYoluMu(yol: string): boolean {
  const y = yol.replace(/\//g, '\\');
  if (/^\\\\\?\\UNC\\/i.test(y)) return true;
  if (/^\\\\[?.]\\/.test(y)) return false; // \\?\C:\... ve \\.\ yerel aygıt yolları
  return y.startsWith('\\\\') || resolve(yol).startsWith('\\\\');
}

function zamanEki(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function bozukMu(h: unknown): boolean {
  const kod = (h as { code?: string })?.code ?? '';
  return kod.startsWith('SQLITE_NOTADB') || kod.startsWith('SQLITE_CORRUPT');
}

type Vt = Database.Database;

/**
 * Yerel katalog (SQLite, `katalog.db`). Dışarıya eski `KayitDeposu` ile aynı yüzü gösterir:
 * `yukle()` → `al/koy/arsivEkle` ya da `veri` üzerinde değişiklik → `kaydet()`.
 *
 * - `kaydet()` yalnız değişen satırları tek transaction'da yazar; yarıda kesilirse eski hâl kalır.
 * - İlk açılışta eski `kayit.json` bir kez aktarılır; dosya silinmez, yedek olarak kalır.
 * - Bozuk JSON da bozuk veritabanı da silinmez: `<ad>.bozuk-<zaman>` olarak kenara alınır.
 */
export class Katalog {
  readonly dosya: string;
  readonly eskiJson: string;
  veri: KayitVerisi = { surum: 1, medya: {}, kullaniciGruplari: [] };
  /** Bu açılışta kenara alınan bozuk dosya (JSON ya da veritabanı), yoksa null. */
  kurtarilan: string | null = null;
  /** Bu açılışta eski `kayit.json` veritabanına aktarıldıysa true. */
  gecildi = false;

  /** Son okunan/yazılan hâl: `kaydet()` yalnız bunlardan farklı olanı yazar. */
  private yazili = new Map<string, string>();
  private yaziliGruplar = '[]';
  private yaziliArsivler = '[]';

  constructor(dosya: string, eskiJson = join(dirname(dosya), ESKI_KAYIT_ADI)) {
    this.dosya = dosya;
    this.eskiJson = eskiJson;
  }

  /** Veritabanını açar, şemayı kurar. Bozuksa (ve `kurtar` true ise) kenara alıp boş bir tane açar. */
  private async ac(kurtar: boolean): Promise<Vt> {
    if (agYoluMu(this.dosya)) {
      throw new Error('Katalog ağ klasöründe açılamaz; çalışma klasörü bu bilgisayarın diskinde olmalı.');
    }
    await mkdir(dirname(this.dosya), { recursive: true });
    let vt = new Database(this.dosya);
    try {
      semaKur(vt);
      return vt;
    } catch (h) {
      vt.close();
      if (!kurtar || !bozukMu(h)) throw h;
    }
    await this.bozukVeritabaniniKenaraAl();
    vt = new Database(this.dosya);
    semaKur(vt);
    return vt;
  }

  /** Veritabanını yan dosyalarıyla (-wal, -shm) birlikte kenara alır; hiçbiri silinmez. */
  private async bozukVeritabaniniKenaraAl(): Promise<void> {
    const yedek = `${this.dosya}.bozuk-${zamanEki()}`;
    await rename(this.dosya, yedek);
    for (const yan of ['-wal', '-shm']) {
      if (existsSync(this.dosya + yan)) await rename(this.dosya + yan, `${yedek}${yan}`);
    }
    this.kurtarilan = yedek;
  }

  /**
   * Kataloğu okur. Dosya yoksa boş başlar; eski `kayit.json` varsa bir kez aktarır.
   * Bozuk veritabanı kenara alınır ve (varsa) eski JSON'dan yeniden kurulur.
   * Başka bir hata (ör. dosya kilitli, daha yeni sürümün şeması) yükselir: boş kayıtla devam edilmez.
   */
  async yukle(): Promise<void> {
    let vt = await this.ac(true);
    try {
      await this.jsonuAktar(vt);
      this.oku(vt);
    } catch (h) {
      vt.close();
      if (!bozukMu(h)) throw h;
      // Başlığı sağlam ama sayfaları bozuk veritabanı: ancak okurken anlaşılır.
      await this.bozukVeritabaniniKenaraAl();
      vt = await this.ac(false);
      try {
        await this.jsonuAktar(vt);
        this.oku(vt);
      } finally {
        vt.close();
      }
      return;
    }
    vt.close();
  }

  private oku(vt: Vt): void {
    const medya: Record<string, IslenmisMedya> = {};
    this.yazili.clear();
    for (const r of vt.prepare('SELECT anahtar, veri FROM medya ORDER BY sira').all() as { anahtar: string; veri: string }[]) {
      medya[r.anahtar] = JSON.parse(r.veri) as IslenmisMedya;
      this.yazili.set(r.anahtar, r.veri);
    }
    const gruplar = (vt.prepare('SELECT veri FROM kullanici_grubu ORDER BY sira').all() as { veri: string }[]).map(
      (r) => JSON.parse(r.veri) as Grup,
    );
    const arsivler = (vt.prepare('SELECT veri FROM son_arsiv ORDER BY sira').all() as { veri: string }[]).map(
      (r) => JSON.parse(r.veri) as SonArsiv,
    );
    this.veri = { surum: 1, medya, kullaniciGruplari: gruplar };
    if (arsivler.length) this.veri.sonArsivler = arsivler;
    this.yaziliGruplar = JSON.stringify(gruplar);
    this.yaziliArsivler = JSON.stringify(arsivler);
  }

  /**
   * Eski `kayit.json`'u bir kez aktarır. Aktarıldığı `meta` tablosuna yazılır; sonraki açılışlarda atlanır.
   * Yine de iki kez çalışırsa veri çoğalmaz ve veritabanındaki daha yeni satırlar ezilmez (`INSERT OR IGNORE`).
   */
  private async jsonuAktar(vt: Vt): Promise<void> {
    if (vt.prepare("SELECT 1 FROM meta WHERE anahtar = 'json_gecisi'").get()) return;
    const isaretle = (durum: string) =>
      vt
        .prepare("INSERT OR REPLACE INTO meta (anahtar, deger) VALUES ('json_gecisi', ?)")
        .run(JSON.stringify({ durum, tarih: new Date().toISOString(), kaynak: this.eskiJson }));

    let metin: string;
    try {
      metin = await readFile(this.eskiJson, 'utf8');
    } catch (h) {
      if ((h as NodeJS.ErrnoException).code !== 'ENOENT') throw h; // kilitli vb.: işaretlenmez, sonra yeniden denenir
      isaretle('yok');
      return;
    }
    let eski: KayitVerisi | null = null;
    try {
      const v = JSON.parse(metin) as KayitVerisi;
      if (v?.surum === 1 && v.medya && typeof v.medya === 'object' && Array.isArray(v.kullaniciGruplari)) eski = v;
    } catch {
      // bozuk JSON: aşağıda kenara alınır
    }
    if (!eski) {
      // Parti 1 koruması: okunamayan ya da bilinmeyen sürümdeki eski kayıt silinmez, kenara alınır.
      const yedek = `${this.eskiJson}.bozuk-${zamanEki()}`;
      await rename(this.eskiJson, yedek);
      this.kurtarilan = yedek;
      isaretle('bozuk');
      return;
    }
    const v = eski;
    vt.transaction(() => {
      const medyaEkle = vt.prepare('INSERT OR IGNORE INTO medya (anahtar, yol, veri) VALUES (?, ?, ?)');
      for (const [anahtar, m] of Object.entries(v.medya)) medyaEkle.run(anahtar, m.yol, JSON.stringify(m));
      const grupEkle = vt.prepare(
        'INSERT OR IGNORE INTO kullanici_grubu (id, sira, veri) VALUES (?, (SELECT COALESCE(MAX(sira), -1) + 1 FROM kullanici_grubu), ?)',
      );
      for (const g of v.kullaniciGruplari) grupEkle.run(g.id, JSON.stringify(g));
      const arsivEkle = vt.prepare(
        'INSERT OR IGNORE INTO son_arsiv (anahtar, sira, veri) VALUES (?, (SELECT COALESCE(MAX(sira), -1) + 1 FROM son_arsiv), ?)',
      );
      for (const a of (v.sonArsivler ?? []).slice(0, SON_ARSIV_SINIRI)) arsivEkle.run(JSON.stringify(a.girdiler), JSON.stringify(a));
      isaretle('aktarildi');
    })();
    this.gecildi = true;
  }

  al(anahtar: string): IslenmisMedya | undefined {
    return this.veri.medya[anahtar];
  }

  koy(m: IslenmisMedya): void {
    this.veri.medya[m.anahtar] = m;
  }

  /** Son açılan arşivleri en yeni başta, tekrarsız ve en fazla SON_ARSIV_SINIRI tane tutar. */
  arsivEkle(a: SonArsiv): void {
    const anahtar = JSON.stringify(a.girdiler);
    const eski = (this.veri.sonArsivler ?? []).filter((x) => JSON.stringify(x.girdiler) !== anahtar);
    this.veri.sonArsivler = [a, ...eski].slice(0, SON_ARSIV_SINIRI);
  }

  /**
   * Değişen medya satırlarını, değiştiyse kullanıcı gruplarını ve son arşivleri tek transaction'da yazar.
   * Hiçbir şey değişmediyse veritabanına dokunulmaz. Medya satırı silinmez (silme ileride kutu ile gelecek).
   */
  async kaydet(): Promise<void> {
    const medya = Object.entries(this.veri.medya)
      .map(([anahtar, m]) => [anahtar, m, JSON.stringify(m)] as const)
      .filter(([anahtar, , metin]) => this.yazili.get(anahtar) !== metin);
    const gruplar = JSON.stringify(this.veri.kullaniciGruplari);
    const arsivler = JSON.stringify(this.veri.sonArsivler ?? []);
    if (!medya.length && gruplar === this.yaziliGruplar && arsivler === this.yaziliArsivler) return;

    const vt = await this.ac(false);
    try {
      vt.transaction(() => {
        const yaz = vt.prepare(
          'INSERT INTO medya (anahtar, yol, veri) VALUES (?, ?, ?) ON CONFLICT(anahtar) DO UPDATE SET yol = excluded.yol, veri = excluded.veri',
        );
        for (const [anahtar, m, metin] of medya) yaz.run(anahtar, m.yol, metin);
        if (gruplar !== this.yaziliGruplar) {
          vt.prepare('DELETE FROM kullanici_grubu').run();
          const ekle = vt.prepare('INSERT OR REPLACE INTO kullanici_grubu (id, sira, veri) VALUES (?, ?, ?)');
          this.veri.kullaniciGruplari.forEach((g, i) => ekle.run(g.id, i, JSON.stringify(g)));
        }
        if (arsivler !== this.yaziliArsivler) {
          vt.prepare('DELETE FROM son_arsiv').run();
          const ekle = vt.prepare('INSERT OR REPLACE INTO son_arsiv (anahtar, sira, veri) VALUES (?, ?, ?)');
          (this.veri.sonArsivler ?? []).forEach((a, i) => ekle.run(JSON.stringify(a.girdiler), i, JSON.stringify(a)));
        }
      })();
    } finally {
      vt.close();
    }
    for (const [anahtar, , metin] of medya) this.yazili.set(anahtar, metin);
    this.yaziliGruplar = gruplar;
    this.yaziliArsivler = arsivler;
  }
}

/** Şemayı kurar ya da günceller. Daha yeni bir sürümün şemasına dokunmaz, hata verir. */
function semaKur(vt: Vt): void {
  vt.pragma('journal_mode = WAL');
  vt.pragma('synchronous = FULL');
  vt.pragma('foreign_keys = ON');
  const surum = vt.pragma('user_version', { simple: true }) as number;
  if (surum > SEMA_SURUMU) {
    throw new Error(`Katalog AYIKLA'nın daha yeni bir sürümüyle yazılmış (şema ${surum}); bu sürüm onu değiştirmez.`);
  }
  if (surum === SEMA_SURUMU) return;
  vt.transaction(() => {
    // Sürüm 0 → 1: ilk şema. Medya kaydı JSON olarak tutulur; ayrıntılı şema (blob, öğe, albüm) FAZ 1 #6'da gelir.
    vt.exec(`
      CREATE TABLE IF NOT EXISTS meta (anahtar TEXT PRIMARY KEY, deger TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS medya (
        sira INTEGER PRIMARY KEY AUTOINCREMENT,
        anahtar TEXT NOT NULL UNIQUE,
        yol TEXT NOT NULL,
        veri TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS medya_yol ON medya (yol);
      CREATE TABLE IF NOT EXISTS kullanici_grubu (id TEXT PRIMARY KEY, sira INTEGER NOT NULL, veri TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS son_arsiv (anahtar TEXT PRIMARY KEY, sira INTEGER NOT NULL, veri TEXT NOT NULL);
    `);
    vt.pragma(`user_version = ${SEMA_SURUMU}`);
  })();
}

/** Çalışma klasöründeki kataloğu açar (eski `kayit.json` aynı klasörde aranır). */
export async function katalogAc(calismaKlasoru: string): Promise<Katalog> {
  const k = new Katalog(join(calismaKlasoru, KATALOG_ADI));
  await k.yukle();
  return k;
}
