import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { hamMi, hamOnizlemeOku } from './ham';

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
  if (hamMi(yol)) return hamOnizleme(yol, hedef);
  try {
    return await yaz(yol, hedef);
  } catch (hata) {
    if (!heicMi(yol)) throw hata;
    return yaz(await heicCevir(yol), hedef);
  }
}

const YON_ACISI: Record<number, number> = { 3: 180, 6: 90, 8: 270 };

/** NEF: gömülü JPEG önizlemeden küçük resim; yön bilgisi NEF'in kendisinden uygulanır. Gerçek boyutu döndürür. */
async function hamOnizleme(yol: string, hedef: string): Promise<{ genislik: number; yukseklik: number }> {
  const h = await hamOnizlemeOku(yol);
  const aci = YON_ACISI[h.yon] ?? 0;
  const jpeg = aci ? await sharp(h.jpeg).rotate(aci).toBuffer() : h.jpeg;
  const onizleme = await yaz(jpeg, hedef);
  if (!h.genislik || !h.yukseklik) return onizleme;
  return h.yon >= 5 ? { genislik: h.yukseklik, yukseklik: h.genislik } : { genislik: h.genislik, yukseklik: h.yukseklik };
}
