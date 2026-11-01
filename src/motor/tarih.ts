import { open, readFile } from 'node:fs/promises';
import { basename, dirname, extname } from 'node:path';
import exifr from 'exifr';
import { videoBilgisi } from './ffmpeg';
import type { IslenmisMedya, MedyaDosyasi, TarihSonucu } from './tipler';

function gecerliTarih(y: number, ay: number, g: number, s = 0, d = 0, sn = 0): Date | null {
  if (y < 1990 || y > 2100 || ay < 1 || ay > 12 || g < 1 || g > 31 || s > 23 || d > 59 || sn > 59) return null;
  const t = new Date(y, ay - 1, g, s, d, sn);
  return t.getMonth() === ay - 1 ? t : null;
}

const KALIPLAR: RegExp[] = [
  // IMG_20240812_153000, PXL_20231101_101112345, Screenshot_20220304-050607
  /(?:^|\D)((?:19|20)\d{2})(\d{2})(\d{2})[_-](\d{2})(\d{2})(\d{2})/,
  // WhatsApp Image 2024-08-12 at 15.30.00
  /((?:19|20)\d{2})-(\d{2})-(\d{2}) at (\d{2})\.(\d{2})\.(\d{2})/,
  // 2019-07-15 / 2019_07_15
  /((?:19|20)\d{2})[-_](\d{2})[-_](\d{2})/,
  // IMG-20210102-WA0001
  /(?:^|\D)((?:19|20)\d{2})(\d{2})(\d{2})(?:\D|$)/,
];

export function tarihDosyaAdindan(ad: string): Date | null {
  for (const k of KALIPLAR) {
    const m = ad.match(k);
    if (!m) continue;
    const s = m.slice(1).map((x) => (x === undefined ? 0 : Number(x)));
    const t = gecerliTarih(s[0], s[1], s[2], s[3] ?? 0, s[4] ?? 0, s[5] ?? 0);
    if (t) return t;
  }
  return null;
}

/** Dosyanın yalnızca başını okur (EXIF orada durur); 50+ MB'lık RAW'larda tüm dosyayı okumamak için. */
async function basiniOku(yol: string, bayt: number): Promise<Buffer> {
  const f = await open(yol, 'r');
  try {
    const { buffer, bytesRead } = await f.read(Buffer.alloc(bayt), 0, bayt, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await f.close();
  }
}

async function exifCoz(veri: Buffer): Promise<Date | null> {
  try {
    const v = await exifr.parse(veri, { pick: ['DateTimeOriginal', 'CreateDate'] });
    const t = v?.DateTimeOriginal ?? v?.CreateDate;
    return t instanceof Date && !Number.isNaN(t.getTime()) && t.getFullYear() >= 1990 ? t : null;
  } catch {
    return null;
  }
}

async function exifTarihi(yol: string): Promise<Date | null> {
  // exifr dosya yolundan okurken Node 26'da çöküyor (FileHandle.stat'a yol veriyor);
  // bu yüzden içeriği kendimiz okuyup veriyoruz. Önce ilk 1 MB; HEIC'te EXIF sonda olabilir.
  try {
    const t = await exifCoz(await basiniOku(yol, 1 << 20));
    if (t) return t;
    const e = extname(yol).toLowerCase();
    return e === '.heic' || e === '.heif' ? await exifCoz(await readFile(yol)) : null;
  } catch {
    return null;
  }
}

async function takeoutTarihi(yol: string): Promise<Date | null> {
  for (const aday of [`${yol}.supplemental-metadata.json`, `${yol}.json`]) {
    try {
      const j = JSON.parse(await readFile(aday, 'utf8'));
      const sn = Number(j?.photoTakenTime?.timestamp);
      if (sn > 0) return new Date(sn * 1000);
    } catch {
      // dosya yok veya bozuk: sıradakine geç
    }
  }
  return null;
}

export async function tarihBul(d: MedyaDosyasi): Promise<TarihSonucu> {
  if (d.tur === 'foto') {
    const t = await exifTarihi(d.yol);
    if (t) return { tarih: t, kaynak: 'exif', tahmini: false };
  } else {
    try {
      const t = (await videoBilgisi(d.yol)).olusturma;
      if (t) return { tarih: t, kaynak: 'video', tahmini: false };
    } catch {
      // okunamayan video: sıradaki yönteme geç
    }
  }
  const tk = await takeoutTarihi(d.yol);
  if (tk) return { tarih: tk, kaynak: 'takeout', tahmini: false };
  const ad = tarihDosyaAdindan(basename(d.yol));
  if (ad) return { tarih: ad, kaynak: 'dosya-adi', tahmini: false };
  return { tarih: new Date(d.degisme), kaynak: 'dosya-tarihi', tahmini: true };
}

function sonNumara(yol: string): number | null {
  const m = basename(yol, extname(yol)).match(/(\d+)(?!.*\d)/);
  return m ? Number(m[1]) : null;
}

/**
 * Çekim tarihi bulunamayan dosyalar (ör. tarih etiketi olmayan AVI) için: aynı klasörde dosya numarası
 * en yakın, tarihi kesin olan dosyanın tarihi kullanılır (makineler dosyaları sırayla numaralar).
 * Sonuç yine "tahmini" işaretlidir.
 */
export function komsuTarihiUygula(liste: IslenmisMedya[]): void {
  const kesin = liste.filter((m) => !m.tahmini && sonNumara(m.yol) !== null);
  for (const m of liste) {
    if (m.tarihKaynagi !== 'dosya-tarihi') continue;
    const n = sonNumara(m.yol);
    if (n === null) continue;
    let en: IslenmisMedya | null = null;
    for (const k of kesin) {
      if (dirname(k.yol) !== dirname(m.yol)) continue;
      if (!en || Math.abs(sonNumara(k.yol)! - n) < Math.abs(sonNumara(en.yol)! - n)) en = k;
    }
    if (en) {
      m.tarih = en.tarih;
      m.tarihKaynagi = 'komsu';
      m.tahmini = true;
    }
  }
}
