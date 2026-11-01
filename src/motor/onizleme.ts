import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

export const ONIZLEME_BOYUT = 384;

function heicMi(yol: string): boolean {
  const e = extname(yol).toLowerCase();
  return e === '.heic' || e === '.heif';
}

async function heicCevir(yol: string): Promise<Buffer> {
  const convert = (await import('heic-convert')).default;
  const cikti = await convert({ buffer: await readFile(yol), format: 'JPEG', quality: 0.9 });
  return Buffer.from(cikti);
}

async function yaz(kaynak: string | Buffer, hedef: string): Promise<{ genislik: number; yukseklik: number }> {
  const m = await sharp(kaynak).metadata();
  await sharp(kaynak)
    .rotate()
    .resize(ONIZLEME_BOYUT, ONIZLEME_BOYUT, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toFile(hedef);
  const dondu = (m.orientation ?? 1) >= 5;
  const g = m.width ?? 0;
  const y = m.height ?? 0;
  return dondu ? { genislik: y, yukseklik: g } : { genislik: g, yukseklik: y };
}

/** Fotoğraftan küçük resim üretir; orijinalin (döndürülmüş) boyutunu döndürür. */
export async function fotoOnizleme(yol: string, hedef: string): Promise<{ genislik: number; yukseklik: number }> {
  try {
    return await yaz(yol, hedef);
  } catch (hata) {
    if (!heicMi(yol)) throw hata;
    return yaz(await heicCevir(yol), hedef);
  }
}
