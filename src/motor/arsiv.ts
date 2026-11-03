import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, open, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { hostname } from 'node:os';
import { join, parse, relative, resolve } from 'node:path';
import type Database from 'better-sqlite3';
import { ARSIV_ISARETI, hedefSorunu, icindeMi } from './disari-aktar';
import { agYoluMu, veritabaniAc } from './katalog';

/**
 * Arşiv kökü (FAZ 1 #5). Kullanıcının seçtiği bir klasör, AYIKLA'nın kalıcı arşivi olur:
 *
 *   <kök>/.ayikla-arsiv       kimlik + sürüm (JSON); taramada bu klasör atlanır
 *   <kök>/katalog/ayikla.db   arşivin kataloğu (SQLite)
 *   <kök>/medya/              içerik adresli tek fiziksel kopyalar (FAZ 1 #6)
 *   <kök>/onizleme/           yeniden üretilebilir küçük resimler
 *   <kök>/yedek/              doğrulanmış katalog yedekleri (FAZ 1 #9)
 *   <kök>/kilit               tek-yazıcı kilidi (cihaz, süreç, zaman)
 *
 * Kimlik klasörle birlikte taşınır: disk harfi değişse de (D: → E:) arşiv kimliğiyle yeniden bulunur.
 */

export const ARSIV_SURUMU = 1;
export const KILIT_ADI = 'kilit';
export const ARSIV_DIZINLERI = ['katalog', 'medya', 'onizleme', 'yedek'] as const;
export const ARSIV_KATALOGU = join('katalog', 'ayikla.db');
/** Kilidi tutan süreç bu aralıkla kilidin zamanını tazeler. */
export const KILIT_TAZELEME_MS = 60_000;
/** Bu süredir tazelenmemiş kilit bayat sayılır (süreç çökmüş ya da numarası başka sürece geçmiş olabilir). */
export const KILIT_ESKIME_MS = 5 * 60_000;

export interface ArsivKimligi {
  uygulama: 'AYIKLA';
  tur: 'arsiv';
  surum: number;
  kimlik: string;
  ad: string;
  olusturma: string; // ISO
}

export type ArsivHataKodu =
  | 'ag-yolu'
  | 'kaynak-icinde'
  | 'bos-degil'
  | 'zaten-arsiv'
  | 'arsiv-degil'
  | 'yeni-surum'
  | 'kilitli'
  | 'bayat-kilit'
  | 'baska-cihaz';

export class ArsivHatasi extends Error {
  constructor(
    readonly kod: ArsivHataKodu,
    mesaj: string,
    readonly kilit?: KilitBilgisi,
  ) {
    super(mesaj);
    this.name = 'ArsivHatasi';
  }
}

async function isaretOku(kok: string): Promise<Record<string, unknown> | null> {
  try {
    return JSON.parse(await readFile(join(kok, ARSIV_ISARETI), 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function kimlikMi(v: Record<string, unknown> | null): v is Record<string, unknown> & ArsivKimligi {
  return !!v && v.uygulama === 'AYIKLA' && v.tur === 'arsiv' && typeof v.kimlik === 'string' && v.kimlik.length > 0;
}

/**
 * Boş (ya da henüz olmayan) bir klasörü arşiv kökü yapar. İçinde başka dosya olan klasör reddedilir:
 * kullanıcının dosyalarıyla arşiv karışmasın. Kaynak klasörlerin içi ya da dışı olamaz.
 */
export async function arsivOlustur(
  kok: string,
  secenek: { ad?: string; kaynaklar?: string[]; calismaKlasoru?: string } = {},
): Promise<ArsivKimligi> {
  const yol = resolve(kok);
  if (agYoluMu(yol)) throw new ArsivHatasi('ag-yolu', 'Arşiv ağ klasöründe olamaz; bu bilgisayara bağlı bir disk seç.');
  const sorun = hedefSorunu(yol, secenek.kaynaklar ?? [], secenek.calismaKlasoru);
  if (sorun) throw new ArsivHatasi('kaynak-icinde', sorun.replace('Kayıt klasörü', 'Arşiv klasörü'));

  if (existsSync(yol)) {
    if (kimlikMi(await isaretOku(yol))) throw new ArsivHatasi('zaten-arsiv', 'Bu klasör zaten bir AYIKLA arşivi.');
    if ((await readdir(yol)).length > 0) {
      throw new ArsivHatasi('bos-degil', 'Arşiv için boş bir klasör seç; bu klasörde başka dosyalar var.');
    }
  }
  await mkdir(yol, { recursive: true });
  const kimlik: ArsivKimligi = {
    uygulama: 'AYIKLA',
    tur: 'arsiv',
    surum: ARSIV_SURUMU,
    kimlik: randomUUID(),
    ad: secenek.ad?.trim() || parse(yol).name || 'Arşiv',
    olusturma: new Date().toISOString(),
  };
  // `wx`: aynı anda iki süreç aynı klasörü arşiv yapmaya kalkarsa yalnız biri kazanır.
  await writeFile(join(yol, ARSIV_ISARETI), JSON.stringify(kimlik, null, 2), { flag: 'wx' });
  for (const d of ARSIV_DIZINLERI) await mkdir(join(yol, d), { recursive: true });
  return kimlik;
}

/** Kökteki kimliği okur. Arşiv değilse ya da daha yeni bir sürümün arşiviyse hata verir. */
export async function arsivKimligiOku(kok: string): Promise<ArsivKimligi> {
  const v = await isaretOku(kok);
  if (!kimlikMi(v)) throw new ArsivHatasi('arsiv-degil', 'Bu klasör bir AYIKLA arşivi değil.');
  if (typeof v.surum !== 'number' || v.surum > ARSIV_SURUMU) {
    throw new ArsivHatasi('yeni-surum', "Bu arşiv AYIKLA'nın daha yeni bir sürümüyle oluşturulmuş; bu sürüm onu açmaz.");
  }
  return v;
}

/** Bu bilgisayardaki disk kökleri (Windows: `C:\`, `D:\` …). */
export function diskKokleri(): string[] {
  if (process.platform !== 'win32') return ['/'];
  const kokler: string[] = [];
  for (let k = 67; k <= 90; k++) {
    const kok = `${String.fromCharCode(k)}:\\`;
    if (existsSync(kok)) kokler.push(kok);
  }
  return kokler;
}

const ATLANAN_ADLAR = new Set([
  'windows',
  'program files',
  'program files (x86)',
  'programdata',
  'system volume information',
  '$recycle.bin',
  'node_modules',
]);

/**
 * Kimliği verilen arşivi arar. Önce son bilinen yerde, sonra aynı yolu her diskte (D: → E:),
 * en son her diskin ilk `derinlik` klasör düzeyinde bakar. Bulunan bütün yerleri döndürür
 * (aynı kimlikte iki klasör, ör. elle kopyalanmış arşiv, varsa ikisi de döner; seçimi kullanıcı yapar).
 */
export async function arsivBul(
  kimlik: string,
  sonYol: string | null,
  kokler: string[] = diskKokleri(),
  derinlik = 2,
): Promise<string[]> {
  const bulunan: string[] = [];
  const bakildi = new Set<string>();
  const dene = async (yol: string) => {
    const r = resolve(yol);
    const anahtar = process.platform === 'win32' ? r.toLowerCase() : r;
    if (bakildi.has(anahtar)) return;
    bakildi.add(anahtar);
    const v = await isaretOku(r);
    if (kimlikMi(v) && v.kimlik === kimlik) bulunan.push(r);
  };

  if (sonYol) {
    const son = resolve(sonYol);
    await dene(son);
    const kok = kokler.find((k) => icindeMi(son, k));
    const govde = kok ? relative(resolve(kok), son) : son.slice(parse(son).root.length);
    for (const k of kokler) await dene(join(k, govde));
  }
  if (bulunan.length) return bulunan;

  const tara = async (klasor: string, kalan: number): Promise<void> => {
    let girdiler;
    try {
      girdiler = await readdir(klasor, { withFileTypes: true });
    } catch {
      return; // erişilemeyen klasör: atla
    }
    for (const g of girdiler) {
      if (!g.isDirectory() || g.name.startsWith('.') || ATLANAN_ADLAR.has(g.name.toLowerCase())) continue;
      const alt = join(klasor, g.name);
      await dene(alt);
      if (kalan > 1) await tara(alt, kalan - 1);
    }
  };
  for (const k of kokler) {
    await dene(k);
    await tara(k, derinlik);
  }
  return bulunan;
}

// ---------------------------------------------------------------- tek-yazıcı kilidi

export interface KilitBilgisi {
  uygulama: 'AYIKLA';
  cihaz: string;
  pid: number;
  zaman: string; // ISO, son tazeleme
  jeton: string;
}

export type KilitDurumu =
  | { durum: 'yok' }
  | { durum: 'canli' | 'bayat' | 'baska-cihaz'; bilgi: KilitBilgisi }
  | { durum: 'okunamadi' };

function surecYasiyorMu(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (h) {
    return (h as NodeJS.ErrnoException).code === 'EPERM'; // var ama bizim değil
  }
}

/** Kökteki kilidin durumu. Kilide dokunmaz. */
export async function kilitDurumu(kok: string, simdi = Date.now()): Promise<KilitDurumu> {
  let metin: string;
  try {
    metin = await readFile(join(kok, KILIT_ADI), 'utf8');
  } catch (h) {
    if ((h as NodeJS.ErrnoException).code === 'ENOENT') return { durum: 'yok' };
    return { durum: 'okunamadi' };
  }
  let bilgi: KilitBilgisi;
  try {
    bilgi = JSON.parse(metin) as KilitBilgisi;
    if (typeof bilgi.pid !== 'number' || typeof bilgi.cihaz !== 'string' || typeof bilgi.jeton !== 'string') {
      return { durum: 'okunamadi' };
    }
  } catch {
    return { durum: 'okunamadi' };
  }
  const zaman = Date.parse(bilgi.zaman);
  const eski = !Number.isFinite(zaman) || simdi - zaman > KILIT_ESKIME_MS;
  if (bilgi.cihaz !== hostname()) return { durum: eski ? 'bayat' : 'baska-cihaz', bilgi };
  return { durum: !eski && surecYasiyorMu(bilgi.pid) ? 'canli' : 'bayat', bilgi };
}

/** Alınmış kilit. Tutulduğu sürece zamanı tazelenir; `birak()` yalnız kendi kilidini siler. */
export class ArsivKilidi {
  private zamanlayici: ReturnType<typeof setInterval> | null;

  constructor(
    readonly yol: string,
    readonly bilgi: KilitBilgisi,
  ) {
    this.zamanlayici = setInterval(() => void this.tazele(), KILIT_TAZELEME_MS);
    this.zamanlayici.unref();
  }

  private async bizimMi(): Promise<boolean> {
    try {
      return (JSON.parse(await readFile(this.yol, 'utf8')) as KilitBilgisi).jeton === this.bilgi.jeton;
    } catch {
      return false;
    }
  }

  async tazele(): Promise<void> {
    if (!(await this.bizimMi())) return;
    try {
      await writeFile(this.yol, JSON.stringify({ ...this.bilgi, zaman: new Date().toISOString() }));
    } catch {
      // disk çıkarılmış olabilir: bir sonraki yazma zaten hata verir
    }
  }

  async birak(): Promise<void> {
    if (this.zamanlayici) clearInterval(this.zamanlayici);
    this.zamanlayici = null;
    if (await this.bizimMi()) await rm(this.yol, { force: true });
  }
}

async function kilitYaz(yol: string, bilgi: KilitBilgisi): Promise<boolean> {
  let dosya;
  try {
    dosya = await open(yol, 'wx'); // yalnız yoksa oluşturur: iki süreçten yalnız biri kazanır
  } catch (h) {
    if ((h as NodeJS.ErrnoException).code === 'EEXIST') return false;
    throw h;
  }
  try {
    await dosya.writeFile(JSON.stringify(bilgi));
    await dosya.sync();
  } finally {
    await dosya.close();
  }
  return true;
}

/**
 * Arşivin tek-yazıcı kilidini alır. Kilit doluysa yazmaz, nedeniyle hata verir:
 * - `kilitli`: bu bilgisayarda AYIKLA bu arşivi şu an kullanıyor.
 * - `baska-cihaz`: başka bir bilgisayar yakın zamanda kilitlemiş; doğrulanamaz.
 * - `bayat-kilit`: kilidi tutan süreç yok ya da kilit uzun süredir tazelenmemiş. Kullanıcı onaylarsa
 *   `bayatKilidiKaldir: true` ile yeniden çağrılır; bu durumda yalnız okunan bayat kilit silinir.
 */
export async function kilitAl(kok: string, secenek: { bayatKilidiKaldir?: boolean } = {}): Promise<ArsivKilidi> {
  const yol = join(kok, KILIT_ADI);
  const bilgi: KilitBilgisi = {
    uygulama: 'AYIKLA',
    cihaz: hostname(),
    pid: process.pid,
    zaman: new Date().toISOString(),
    jeton: randomBytes(12).toString('hex'),
  };
  for (let deneme = 0; deneme < 3; deneme++) {
    if (await kilitYaz(yol, bilgi)) return new ArsivKilidi(yol, bilgi);
    const d = await kilitDurumu(kok);
    if (d.durum === 'yok') continue; // bu arada bırakıldı
    if (d.durum === 'canli') {
      throw new ArsivHatasi('kilitli', 'Bu arşiv şu an başka bir AYIKLA penceresinde açık. Önce onu kapat.', d.bilgi);
    }
    if (d.durum === 'baska-cihaz') {
      throw new ArsivHatasi(
        'baska-cihaz',
        `Bu arşiv "${d.bilgi.cihaz}" bilgisayarında açık görünüyor. Oradaki AYIKLA'yı kapatıp yeniden dene.`,
        d.bilgi,
      );
    }
    const okunan = d.durum === 'bayat' ? d.bilgi : undefined;
    if (!secenek.bayatKilidiKaldir) {
      throw new ArsivHatasi(
        'bayat-kilit',
        'Bu arşiv son kullanımda düzgün kapatılmamış. Başka hiçbir yerde açık değilse kilidi kaldırıp devam edebilirsin.',
        okunan,
      );
    }
    // Yalnız az önce okuduğumuz bayat kilidi sil (bu arada başkası almışsa ona dokunma).
    const simdiki = await kilitDurumu(kok);
    const ayni =
      (simdiki.durum === 'okunamadi' && d.durum === 'okunamadi') ||
      (simdiki.durum === 'bayat' && simdiki.bilgi.jeton === okunan?.jeton);
    if (ayni) await rm(yol, { force: true });
  }
  throw new ArsivHatasi('kilitli', 'Arşivin kilidi alınamadı; başka bir pencere aynı anda açmaya çalışıyor olabilir.');
}

// ---------------------------------------------------------------- açık arşiv

/** Kilidi alınmış, kataloğu açık arşiv. Yazan bütün işler bunun üzerinden yapılır. */
export class Arsiv {
  private constructor(
    readonly kok: string,
    readonly kimlik: ArsivKimligi,
    readonly vt: Database.Database,
    private readonly kilit: ArsivKilidi,
  ) {}

  static async ac(kok: string, secenek: { bayatKilidiKaldir?: boolean } = {}): Promise<Arsiv> {
    const yol = resolve(kok);
    if (agYoluMu(yol)) throw new ArsivHatasi('ag-yolu', 'Arşiv ağ klasöründe açılamaz.');
    const kimlik = await arsivKimligiOku(yol);
    const kilit = await kilitAl(yol, secenek);
    try {
      for (const d of ARSIV_DIZINLERI) await mkdir(join(yol, d), { recursive: true });
      const vt = await veritabaniAc(join(yol, ARSIV_KATALOGU));
      return new Arsiv(yol, kimlik, vt, kilit);
    } catch (h) {
      await kilit.birak();
      throw h;
    }
  }

  yol(...parcalar: string[]): string {
    return join(this.kok, ...parcalar);
  }

  async kapat(): Promise<void> {
    if (this.vt.open) this.vt.close();
    await this.kilit.birak();
  }
}
