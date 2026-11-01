import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import exifr from 'exifr';
import { videoBilgisi } from './ffmpeg';
import type { MedyaDosyasi, TarihSonucu } from './tipler';

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

async function exifTarihi(yol: string): Promise<Date | null> {
  try {
    // exifr dosya yolundan okurken Node 26'da çöküyor (FileHandle.stat'a yol veriyor);
    // bu yüzden dosyayı kendimiz okuyup içeriğini veriyoruz.
    const v = await exifr.parse(await readFile(yol), { pick: ['DateTimeOriginal', 'CreateDate'] });
    const t = v?.DateTimeOriginal ?? v?.CreateDate;
    return t instanceof Date && !Number.isNaN(t.getTime()) && t.getFullYear() >= 1990 ? t : null;
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
