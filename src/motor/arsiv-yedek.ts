import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { ARSIV_DIZINLERI, ARSIV_KATALOGU, ARSIV_SURUMU, type Arsiv, type ArsivKimligi } from './arsiv';
import type { BlobSatiri } from './arsiv-depo';
import { ARSIV_ISARETI, dosyaOzeti, geciciyeKopyala, icindeMi } from './disari-aktar';
import { SEMA_SURUMU, agYoluMu } from './katalog';

/**
 * Doğrulanmış yedek ve geri yükleme (FAZ 1 #9).
 *
 * Yedek, arşivin tam bir kopyasıdır (başka bir diskte olmalı):
 *   <yedek>/.ayikla-arsiv     `tur: "yedek"` işareti: tarayıcı atlar, arşiv sanılmaz
 *   <yedek>/yedek.json        kimlik, zaman, katalog özeti (SHA-256), blob sayısı
 *   <yedek>/katalog/ayikla.db SQLite çevrimiçi yedeği (arşiv açıkken alınır), `integrity_check` ile denetlenir
 *   <yedek>/medya/…           her blob, adındaki SHA-256 ile doğrulanarak kopyalanır
 *
 * Aynı klasöre yeniden yedek almak yalnız eksik ya da değişmiş blobları kopyalar. Bozuk yedek "tamam" görünmez:
 * `yedekDogrula` her şeyi yeniden okur. Geri yükleme önce yedeği baştan sona doğrular, sonra yazar.
 */

export const YEDEK_BILGISI = 'yedek.json';
const GECICI_UZANTI = '.ayikla-gecici';

export interface YedekBilgisi {
  uygulama: 'AYIKLA';
  tur: 'arsiv-yedegi';
  surum: 1;
  arsiv: ArsivKimligi;
  zaman: string; // ISO
  katalog: { yol: string; sha256: string; boyut: number; sema: number };
  blob: { sayi: number; toplamBoyut: number };
}

export interface YedekSonucu {
  bilgi: YedekBilgisi;
  kopyalanan: number;
  atlanan: number; // yedekte zaten sağlam duruyordu
  eksik: string[]; // arşivde dosyası bulunamayan blob (yedeğe alınamadı)
}

export interface DogrulamaSonucu {
  tamam: boolean;
  sorunlar: string[];
  bilgi?: YedekBilgisi;
}

function goreliYol(kok: string, goreli: string): string {
  return join(kok, ...goreli.split('/'));
}

/** Kaynağı geçici dosyaya kopyalar, özetini beklenene karşı iki kez (okurken ve yazdıktan sonra) doğrular, sonra yerine koyar. */
async function dogrulanmisKopya(kaynak: string, hedef: string, beklenen: string): Promise<void> {
  await mkdir(dirname(hedef), { recursive: true });
  const gecici = join(dirname(hedef), `.${randomBytes(6).toString('hex')}${GECICI_UZANTI}`);
  try {
    const okunan = await geciciyeKopyala(kaynak, gecici);
    if (okunan !== beklenen) throw new Error(`Kaynak dosyanın özeti kayıtla uyuşmuyor: ${kaynak}`);
    if ((await dosyaOzeti(gecici)) !== beklenen) throw new Error(`Kopya doğrulanamadı: ${hedef}`);
    await rename(gecici, hedef);
  } finally {
    await rm(gecici, { force: true });
  }
}

/** SQLite dosyası sağlam mı (`PRAGMA integrity_check`), şema sürümü ve blob listesi ne? */
function katalogDenetle(dosya: string): { sorun: string | null; sema: number; blob: BlobSatiri[] } {
  let vt: Database.Database | null = null;
  try {
    vt = new Database(dosya, { readonly: true, fileMustExist: true });
    const sonuc = vt.pragma('integrity_check', { simple: true });
    if (sonuc !== 'ok') return { sorun: `Katalog bütünlük denetiminden geçmedi: ${String(sonuc)}`, sema: 0, blob: [] };
    const sema = vt.pragma('user_version', { simple: true }) as number;
    const blob = sema >= 2 ? (vt.prepare('SELECT * FROM blob ORDER BY sha256').all() as BlobSatiri[]) : [];
    return { sorun: null, sema, blob };
  } catch (h) {
    return { sorun: `Katalog açılamadı: ${h instanceof Error ? h.message : String(h)}`, sema: 0, blob: [] };
  } finally {
    vt?.close();
  }
}

async function isaretOku(kok: string): Promise<Record<string, unknown> | null> {
  try {
    return JSON.parse(await readFile(join(kok, ARSIV_ISARETI), 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Arşivin doğrulanmış tam yedeğini `hedef` klasörüne alır. Hedef boş olmalı ya da aynı arşivin eski yedeği olmalı.
 * Arşivin içinde olamaz, arşivi içine alamaz, ağ yolunda olamaz.
 */
export async function arsivYedekle(a: Arsiv, hedef: string, ilerleme?: (bitti: number, toplam: number) => void): Promise<YedekSonucu> {
  const kok = resolve(hedef);
  if (agYoluMu(kok)) throw new Error('Yedek ağ klasörüne alınamaz.');
  if (icindeMi(kok, a.kok) || icindeMi(a.kok, kok)) throw new Error('Yedek klasörü arşivin içinde olamaz, arşivi de içine alamaz.');
  if (existsSync(kok) && (await readdir(kok)).length > 0) {
    const isaret = await isaretOku(kok);
    if (!(isaret?.tur === 'yedek' && isaret.kaynakKimlik === a.kimlik.kimlik)) {
      throw new Error('Yedek için boş bir klasör seç (ya da bu arşivin eski yedeğini).');
    }
  }
  await mkdir(join(kok, 'katalog'), { recursive: true });
  await writeFile(
    join(kok, ARSIV_ISARETI),
    JSON.stringify({ uygulama: 'AYIKLA', surum: ARSIV_SURUMU, tur: 'yedek', kaynakKimlik: a.kimlik.kimlik }, null, 2),
  );

  // 1) Katalog: çevrimiçi yedek → bütünlük denetimi → yerine koy.
  const katalogYolu = join(kok, ARSIV_KATALOGU);
  const gecici = `${katalogYolu}.${randomBytes(4).toString('hex')}${GECICI_UZANTI}`;
  let blobListesi: BlobSatiri[];
  let sema: number;
  try {
    await a.vt.backup(gecici);
    const d = katalogDenetle(gecici);
    if (d.sorun) throw new Error(d.sorun);
    blobListesi = d.blob;
    sema = d.sema;
    await rename(gecici, katalogYolu);
  } finally {
    await rm(gecici, { force: true });
  }

  // 2) Bloblar: yedekte aynı boyutta ve aynı özette varsa atla, yoksa doğrulayarak kopyala.
  let kopyalanan = 0;
  let atlanan = 0;
  const eksik: string[] = [];
  let toplamBoyut = 0;
  for (let i = 0; i < blobListesi.length; i++) {
    const b = blobListesi[i];
    toplamBoyut += b.boyut;
    const kaynak = goreliYol(a.kok, b.yol_goreli);
    const varis = goreliYol(kok, b.yol_goreli);
    const mevcut = await stat(varis).catch(() => null);
    if (mevcut?.size === b.boyut && (await dosyaOzeti(varis)) === b.sha256) {
      atlanan++;
    } else if (!existsSync(kaynak)) {
      eksik.push(b.yol_goreli);
    } else {
      await dogrulanmisKopya(kaynak, varis, b.sha256);
      kopyalanan++;
    }
    ilerleme?.(i + 1, blobListesi.length);
  }

  // 3) Yedek bilgisi en son yazılır: yarıda kalan yedekte bilgi dosyası eski kalır, doğrulama uyuşmazlığı bulur.
  const bilgi: YedekBilgisi = {
    uygulama: 'AYIKLA',
    tur: 'arsiv-yedegi',
    surum: 1,
    arsiv: a.kimlik,
    zaman: new Date().toISOString(),
    katalog: {
      yol: ARSIV_KATALOGU.split(/[\\/]/).join('/'),
      sha256: await dosyaOzeti(katalogYolu),
      boyut: (await stat(katalogYolu)).size,
      sema,
    },
    blob: { sayi: blobListesi.length, toplamBoyut },
  };
  const bilgiYolu = join(kok, YEDEK_BILGISI);
  await writeFile(`${bilgiYolu}${GECICI_UZANTI}`, JSON.stringify(bilgi, null, 2));
  await rename(`${bilgiYolu}${GECICI_UZANTI}`, bilgiYolu);
  return { bilgi, kopyalanan, atlanan, eksik };
}

/** Yedeği baştan sona doğrular: bilgi dosyası, katalog özeti ve bütünlüğü, her blobun varlığı ve özeti. */
export async function yedekDogrula(yedek: string, ilerleme?: (bitti: number, toplam: number) => void): Promise<DogrulamaSonucu> {
  const kok = resolve(yedek);
  const sorunlar: string[] = [];
  let bilgi: YedekBilgisi;
  try {
    bilgi = JSON.parse(await readFile(join(kok, YEDEK_BILGISI), 'utf8')) as YedekBilgisi;
    if (bilgi.tur !== 'arsiv-yedegi' || !bilgi.arsiv?.kimlik || !bilgi.katalog?.sha256) throw new Error();
  } catch {
    return { tamam: false, sorunlar: ['Yedek bilgisi (yedek.json) yok ya da okunamıyor.'] };
  }
  const katalogYolu = goreliYol(kok, bilgi.katalog.yol);
  if (!existsSync(katalogYolu)) return { tamam: false, sorunlar: ['Yedekte katalog yok.'], bilgi };
  if ((await dosyaOzeti(katalogYolu)) !== bilgi.katalog.sha256) {
    sorunlar.push('Katalog dosyası yedek alındığından beri değişmiş ya da bozulmuş.');
  }
  const d = katalogDenetle(katalogYolu);
  if (d.sorun) return { tamam: false, sorunlar: [...sorunlar, d.sorun], bilgi };
  if (d.sema > SEMA_SURUMU) sorunlar.push("Yedek AYIKLA'nın daha yeni bir sürümüyle alınmış.");
  if (d.blob.length !== bilgi.blob.sayi) {
    sorunlar.push(`Katalogdaki dosya sayısı (${d.blob.length}) yedek bilgisiyle (${bilgi.blob.sayi}) uyuşmuyor.`);
  }
  for (let i = 0; i < d.blob.length; i++) {
    const b = d.blob[i];
    const yol = goreliYol(kok, b.yol_goreli);
    const s = await stat(yol).catch(() => null);
    if (!s) sorunlar.push(`Eksik dosya: ${b.yol_goreli}`);
    else if (s.size !== b.boyut || (await dosyaOzeti(yol)) !== b.sha256) sorunlar.push(`Bozuk dosya: ${b.yol_goreli}`);
    ilerleme?.(i + 1, d.blob.length);
  }
  return { tamam: sorunlar.length === 0, sorunlar, bilgi };
}

/**
 * Yedeği `yeniKok` klasörüne geri yükler (boş ya da olmayan klasör). Önce yedek doğrulanır; bir sorun varsa
 * hiçbir şey yazılmaz. Geri yüklenen arşiv aynı kimliği taşır (aynı arşivin yerine geçer).
 * Kimlik dosyası en son yazılır: yarıda kalan geri yükleme arşiv sanılmaz.
 */
export async function yedektenGeriYukle(yedek: string, yeniKok: string): Promise<{ kimlik: ArsivKimligi; blob: number }> {
  const kaynak = resolve(yedek);
  const kok = resolve(yeniKok);
  if (agYoluMu(kok)) throw new Error('Arşiv ağ klasörüne geri yüklenemez.');
  if (icindeMi(kok, kaynak) || icindeMi(kaynak, kok)) throw new Error('Geri yükleme klasörü yedeğin içinde olamaz.');
  if (existsSync(kok) && (await readdir(kok)).length > 0) throw new Error('Geri yüklemek için boş bir klasör seç.');

  const d = await yedekDogrula(kaynak);
  if (!d.tamam || !d.bilgi) throw new Error(`Yedek doğrulanamadı, geri yüklenmedi:\n${d.sorunlar.join('\n')}`);
  const bilgi = d.bilgi;

  await mkdir(kok, { recursive: true });
  for (const dz of ARSIV_DIZINLERI) await mkdir(join(kok, dz), { recursive: true });
  await dogrulanmisKopya(goreliYol(kaynak, bilgi.katalog.yol), goreliYol(kok, bilgi.katalog.yol), bilgi.katalog.sha256);
  const { blob } = katalogDenetle(goreliYol(kok, bilgi.katalog.yol));
  for (const b of blob) await dogrulanmisKopya(goreliYol(kaynak, b.yol_goreli), goreliYol(kok, b.yol_goreli), b.sha256);
  await writeFile(join(kok, ARSIV_ISARETI), JSON.stringify(bilgi.arsiv, null, 2), { flag: 'wx' });
  return { kimlik: bilgi.arsiv, blob: blob.length };
}
