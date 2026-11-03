import { createHash, randomBytes } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/** Dışa aktarma hedefinin köküne yazılan işaret: tarayıcı bu klasörleri kaynak diye yeniden taramaz. */
export const ARSIV_ISARETI = '.ayikla-arsiv';
const GECICI_UZANTI = '.ayikla-gecici';
const DENEME_SAYISI = 2;

export interface AktarilacakOge {
  yol: string;
  grupAdi: string;
  tarih: string; // ISO
}

export interface AktarmaSonucu {
  kopyalanan: number; // yalnız SHA-256 ile kaynağa karşı doğrulanmış kopyalar
  atlanan: number; // hedefte içeriği birebir aynı dosya zaten vardı
  hatalar: { yol: string; hata: string }[];
}

/** Yalnız testler için: geçici kopya yazıldıktan sonra, doğrulamadan önce çağrılır. */
export interface AktarmaKancalari {
  kopyadanSonra?: (kaynak: string, gecici: string) => Promise<void>;
}

/** Windows klasör adında yasak karakterleri temizler. "Deniz / Plaj" → "Deniz - Plaj". */
export function guvenliAd(ad: string): string {
  return ad.replace(/ \/ /g, ' - ').replace(/[<>:"/\\|?*]/g, '-').trim();
}

export function hedefKlasor(kok: string, grupAdi: string, tarihIso: string): string {
  const t = new Date(tarihIso);
  const ay = String(t.getMonth() + 1).padStart(2, '0');
  return join(kok, guvenliAd(grupAdi), String(t.getFullYear()), `${ay}-${AYLAR[t.getMonth()]}`);
}

/** `ic`, `dis` klasörünün kendisi ya da içinde mi? Windows'ta büyük/küçük harf fark etmez. */
export function icindeMi(ic: string, dis: string, harfDuyarsiz = process.platform === 'win32'): boolean {
  const n = (y: string) => (harfDuyarsiz ? resolve(y).toLowerCase() : resolve(y));
  const r = relative(n(dis), n(ic));
  return r === '' || (!r.startsWith('..') && !isAbsolute(r));
}

/**
 * Kayıt klasörü güvenli mi? Güvenli değilse kullanıcıya gösterilecek nedeni döndürür.
 * Kaynağın içine yazmak kopyaların sonraki taramada yeniden bulunmasına (ve kaynak klasörün
 * değişmesine) yol açar; kaynağı içine alan hedef de aynı döngüyü kurar.
 */
export function hedefSorunu(hedef: string, kaynakKlasorleri: string[], calismaKlasoru?: string): string | null {
  for (const k of kaynakKlasorleri) {
    if (icindeMi(hedef, k)) return 'Kayıt klasörü, fotoğrafların bulunduğu klasörün içinde olamaz. Başka bir klasör seç.';
    if (icindeMi(k, hedef)) return 'Kayıt klasörü, fotoğrafların bulunduğu klasörü içine alamaz. Başka bir klasör seç.';
  }
  if (calismaKlasoru && icindeMi(hedef, calismaKlasoru)) return 'Kayıt klasörü AYIKLA’nın kendi çalışma klasörü olamaz.';
  return null;
}

async function boyutu(yol: string): Promise<number | null> {
  try {
    return (await stat(yol)).size;
  } catch {
    return null;
  }
}

/** Dosyanın SHA-256 özeti (akışla okunur; büyük videolar belleğe alınmaz). */
export async function dosyaOzeti(yol: string): Promise<string> {
  const ozet = createHash('sha256');
  for await (const parca of createReadStream(yol)) ozet.update(parca as Buffer);
  return ozet.digest('hex');
}

/** Kaynağı yalnız okuyarak geçici dosyaya yazar; yazarken kaynağın özetini çıkarır. */
async function geciciyeKopyala(kaynak: string, gecici: string): Promise<string> {
  const ozet = createHash('sha256');
  await pipeline(
    createReadStream(kaynak),
    async function* (akis: AsyncIterable<Buffer>) {
      for await (const parca of akis) {
        ozet.update(parca);
        yield parca;
      }
    },
    createWriteStream(gecici, { flags: 'wx' }),
  );
  return ozet.digest('hex');
}

async function isaretKoy(kok: string): Promise<void> {
  await mkdir(kok, { recursive: true });
  const icerik = JSON.stringify({ uygulama: 'AYIKLA', surum: 1, olusturma: new Date().toISOString() });
  try {
    await writeFile(join(kok, ARSIV_ISARETI), icerik, { flag: 'wx' });
  } catch (h) {
    if ((h as NodeJS.ErrnoException).code !== 'EEXIST') throw h;
  }
}

type TekSonuc = 'kopyalandi' | 'vardi';

/**
 * Tek dosya: geçici dosyaya kopyala → kaynak değişmedi mi bak → kopyanın SHA-256'sını kaynağınkiyle
 * karşılaştır → boş ada taşı. Hedefte aynı içerik zaten varsa kopyalamaz. Kaynağa hiç yazılmaz.
 */
async function tekDosya(o: AktarilacakOge, kok: string, kanca?: AktarmaKancalari): Promise<TekSonuc> {
  const klasor = hedefKlasor(kok, o.grupAdi, o.tarih);
  await mkdir(klasor, { recursive: true });
  const uzanti = extname(o.yol);
  const govde = basename(o.yol, uzanti);
  const adAl = (n: number) => join(klasor, n === 1 ? `${govde}${uzanti}` : `${govde} (${n})${uzanti}`);

  let sonHata = '';
  for (let deneme = 1; deneme <= DENEME_SAYISI; deneme++) {
    const once = await stat(o.yol);
    let kaynakOzeti: string | null = null;

    // Boş ad bul; aynı boyutlu dosya varsa içeriğine bak: birebir aynıysa yeniden kopyalama.
    let n = 1;
    for (; ; n++) {
      const mevcut = await boyutu(adAl(n));
      if (mevcut === null) break;
      if (mevcut === once.size) {
        kaynakOzeti ??= await dosyaOzeti(o.yol);
        if ((await dosyaOzeti(adAl(n))) === kaynakOzeti) return 'vardi';
      }
    }

    const gecici = join(klasor, `.${govde}${uzanti}.${randomBytes(4).toString('hex')}${GECICI_UZANTI}`);
    try {
      const okunanOzet = await geciciyeKopyala(o.yol, gecici);
      await kanca?.kopyadanSonra?.(o.yol, gecici);
      const sonra = await stat(o.yol);
      if (sonra.size !== once.size || sonra.mtimeMs !== once.mtimeMs) {
        sonHata = 'Kopyalanırken kaynak dosya değişti';
        continue;
      }
      if ((await dosyaOzeti(gecici)) !== okunanOzet) {
        sonHata = 'Kopya doğrulanamadı (SHA-256 uyuşmadı)';
        continue;
      }
      // Seçilen ad bu arada dolduysa sıradaki boş adı kullan (rename Windows'ta üzerine yazar; önce bakılır).
      while ((await boyutu(adAl(n))) !== null) n++;
      await rename(gecici, adAl(n));
      return 'kopyalandi';
    } finally {
      await rm(gecici, { force: true });
    }
  }
  throw new Error(`${sonHata} (${DENEME_SAYISI} deneme)`);
}

/**
 * Kopyalar; asla üzerine yazmaz, kaynağa dokunmaz. Her kopya SHA-256 ile doğrulanmadan sayılmaz.
 * Yarım kalan kopya yalnız gizli geçici adla kalır ve temizlenir. Disk dolarsa durur.
 */
export async function disariAktar(
  ogeler: AktarilacakOge[],
  kok: string,
  ilerleme?: (bitti: number, toplam: number) => void,
  kanca?: AktarmaKancalari,
): Promise<AktarmaSonucu> {
  const sonuc: AktarmaSonucu = { kopyalanan: 0, atlanan: 0, hatalar: [] };
  await isaretKoy(kok);
  for (let i = 0; i < ogeler.length; i++) {
    const o = ogeler[i];
    try {
      if ((await tekDosya(o, kok, kanca)) === 'kopyalandi') sonuc.kopyalanan++;
      else sonuc.atlanan++;
    } catch (h) {
      sonuc.hatalar.push({ yol: o.yol, hata: h instanceof Error ? h.message : String(h) });
      if ((h as NodeJS.ErrnoException).code === 'ENOSPC') break;
    }
    ilerleme?.(i + 1, ogeler.length);
  }
  return sonuc;
}
