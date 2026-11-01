import sharp from 'sharp';

export const KOPYA_ESIK = 6; // 64 bitten en fazla bu kadar fark → kopya

/** dHash: 9x8 gri resimde yan yana piksellerin karşılaştırması → 64 bit. */
export async function parmakiziHesapla(onizleme: string): Promise<string> {
  const { data } = await sharp(onizleme)
    .greyscale()
    .resize(9, 8, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let deger = 0n;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      deger = (deger << 1n) | (data[y * 9 + x] < data[y * 9 + x + 1] ? 1n : 0n);
    }
  }
  return deger.toString(16).padStart(16, '0');
}

export function mesafe(a: string, b: string): number {
  let x = BigInt('0x' + a) ^ BigInt('0x' + b);
  let n = 0;
  while (x) {
    n += Number(x & 1n);
    x >>= 1n;
  }
  return n;
}

/** Birbirine çok benzeyenleri kümeler; her kümede en yüksek puanlı kalır, gerisi döner. */
export function kopyalariBul<T extends { parmakizi: string }>(liste: T[], puan: (t: T) => number): Set<T> {
  return new Set(kopyaKumeleri(liste, puan).flatMap((k) => k.elenen));
}

/** Kopya kümeleri: her kümede kalan (en yüksek puanlı) ve elenenler. */
export function kopyaKumeleri<T extends { parmakizi: string }>(liste: T[], puan: (t: T) => number): { kalan: T; elenen: T[] }[] {
  const kumeler: { kalan: T; elenen: T[] }[] = [];
  const ziyaret = new Set<number>();
  for (let i = 0; i < liste.length; i++) {
    if (ziyaret.has(i)) continue;
    ziyaret.add(i);
    const kume = [i];
    for (let j = i + 1; j < liste.length; j++) {
      if (!ziyaret.has(j) && mesafe(liste[i].parmakizi, liste[j].parmakizi) <= KOPYA_ESIK) {
        kume.push(j);
        ziyaret.add(j);
      }
    }
    if (kume.length > 1) {
      const enIyi = kume.reduce((a, b) => (puan(liste[b]) > puan(liste[a]) ? b : a));
      kumeler.push({ kalan: liste[enIyi], elenen: kume.filter((k) => k !== enIyi).map((k) => liste[k]) });
    }
  }
  return kumeler;
}
