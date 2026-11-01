import { open } from 'node:fs/promises';
import { extname } from 'node:path';

/** Desteklenen ham (RAW) biçimler. NEF, içinde hazır JPEG önizlemeler taşıyan bir TIFF dosyasıdır. */
export const HAM_UZANTILARI = new Set(['.nef']);
/** Küçük resim için yeterince büyük ama hızlı okunacak önizleme: bundan küçük olanlar (160×120 vb.) atlanır. */
export const ONIZLEME_ALT_SINIR = 150_000; // bayt

export function hamMi(yol: string): boolean {
  return HAM_UZANTILARI.has(extname(yol).toLowerCase());
}

export interface HamOnizleme {
  jpeg: Buffer;
  yon: number; // EXIF Orientation (1 = düz, 6 = 90°, 8 = 270°, 3 = 180°)
  genislik: number; // ham görüntünün gerçek boyutu (döndürülmemiş)
  yukseklik: number;
}

interface Giris {
  tip: number;
  sayi: number;
  deger: number;
}

/**
 * NEF'in içindeki gömülü JPEG önizlemeyi çıkarır. Dosyanın yalnızca başı (yapı bilgisi) ve seçilen
 * önizleme okunur; 50+ MB'lık ham veri hiç okunmaz.
 */
export async function hamOnizlemeOku(yol: string): Promise<HamOnizleme> {
  const f = await open(yol, 'r');
  try {
    const BAS = 1 << 20;
    const { buffer: bas, bytesRead } = await f.read(Buffer.alloc(BAS), 0, BAS, 0);
    const oku = async (ofs: number, n: number): Promise<Buffer> => {
      if (ofs + n <= bytesRead) return Buffer.from(bas.subarray(ofs, ofs + n));
      const { buffer, bytesRead: okunan } = await f.read(Buffer.alloc(n), 0, n, ofs);
      if (okunan < n) throw new Error('RAW dosyası eksik veya bozuk');
      return buffer;
    };
    const sira = bas.toString('latin1', 0, 2);
    if (bytesRead < 8 || (sira !== 'II' && sira !== 'MM')) throw new Error('RAW dosyası okunamadı (TIFF yapısı yok)');
    const le = sira === 'II';
    const u16 = (b: Buffer, o: number) => (le ? b.readUInt16LE(o) : b.readUInt16BE(o));
    const u32 = (b: Buffer, o: number) => (le ? b.readUInt32LE(o) : b.readUInt32BE(o));
    if (u16(bas, 2) !== 42) throw new Error('RAW dosyası okunamadı (TIFF yapısı yok)');

    async function ifdOku(ofs: number): Promise<Map<number, Giris>> {
      const n = u16(await oku(ofs, 2), 0);
      if (n === 0 || n > 1000) throw new Error('RAW dosyası okunamadı (bozuk yapı)');
      const g = await oku(ofs + 2, n * 12);
      const t = new Map<number, Giris>();
      for (let i = 0; i < n; i++) {
        const e = i * 12;
        const tip = u16(g, e + 2);
        const sayi = u32(g, e + 4);
        t.set(u16(g, e), { tip, sayi, deger: tip === 3 && sayi === 1 ? u16(g, e + 8) : u32(g, e + 8) });
      }
      return t;
    }

    const ifd0 = await ifdOku(u32(bas, 4));
    const ifdler = [ifd0];
    const alt = ifd0.get(0x14a); // SubIFDs
    if (alt) {
      const ofsler: number[] = [];
      if (alt.sayi === 1) ofsler.push(alt.deger);
      else {
        const d = await oku(alt.deger, alt.sayi * 4);
        for (let i = 0; i < alt.sayi; i++) ofsler.push(u32(d, i * 4));
      }
      for (const o of ofsler) ifdler.push(await ifdOku(o));
    }

    const jpegler = ifdler
      .filter((t) => t.has(0x201) && t.has(0x202))
      .map((t) => ({ ofs: t.get(0x201)!.deger, uzunluk: t.get(0x202)!.deger }))
      .filter((j) => j.uzunluk > 0)
      .sort((a, b) => a.uzunluk - b.uzunluk);
    if (!jpegler.length) throw new Error('RAW dosyasında gömülü önizleme yok');
    const secilen = jpegler.find((j) => j.uzunluk >= ONIZLEME_ALT_SINIR) ?? jpegler[jpegler.length - 1];
    const jpeg = await oku(secilen.ofs, secilen.uzunluk);
    if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) throw new Error('RAW dosyasındaki önizleme bozuk');

    // Gerçek boyut: en büyük alanlı görüntü bölümü (ham veri)
    let genislik = 0;
    let yukseklik = 0;
    for (const t of ifdler) {
      const g = t.get(0x100)?.deger ?? 0;
      const y = t.get(0x101)?.deger ?? 0;
      if (g * y > genislik * yukseklik) {
        genislik = g;
        yukseklik = y;
      }
    }
    return { jpeg, yon: ifd0.get(0x112)?.deger ?? 1, genislik, yukseklik };
  } finally {
    await f.close();
  }
}
