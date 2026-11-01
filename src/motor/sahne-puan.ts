import { DIGER_ID } from './gruplar';

export interface GrupVektoru {
  grupId: string;
  vektorler: number[][];
}

export const DIGER_ESIK = 0.3; // en iyi grubun olasılığı bunun altındaysa "Diğer"
export const KARARSIZ_FARK = 0.1; // en iyi iki grup bu kadar yakınsa "Diğer"

export function normalize(v: ArrayLike<number>): number[] {
  let n = 0;
  for (let i = 0; i < v.length; i++) n += v[i] * v[i];
  n = Math.sqrt(n) || 1;
  return Array.from(v, (x) => x / n);
}

export function benzerlik(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

export function ortalamaVektor(vs: number[][]): number[] {
  const t = new Array<number>(vs[0].length).fill(0);
  for (const v of vs) v.forEach((x, i) => (t[i] += x));
  return normalize(t);
}

/**
 * CLIP usulü: her tarifin benzerliği ×100 → tüm tarifler üzerinde softmax; bir grubun olasılığı
 * tariflerinin olasılıkları toplamıdır. Böylece fotoğrafı birçok yönden anlatan grup (ör. "masada
 * oturan insanlar", "kadeh kaldıran insanlar") tek bir tarifi az farkla önde olan gruba üstün gelir.
 * Kararsız veya zayıf eşleşme "Diğer" olur.
 */
export function grupSec(resim: number[], gruplar: GrupVektoru[], esik = DIGER_ESIK): { grupId: string; olasilik: number } {
  if (gruplar.length === 0) return { grupId: DIGER_ID, olasilik: 0 };
  const puanlar = gruplar.map((g) => g.vektorler.map((t) => 100 * benzerlik(resim, t)));
  const enBuyuk = Math.max(...puanlar.flat());
  const us = puanlar.map((p) => p.reduce((s, x) => s + Math.exp(x - enBuyuk), 0));
  const toplam = us.reduce((a, b) => a + b, 0);
  let en = 0;
  for (let i = 1; i < us.length; i++) if (us[i] > us[en]) en = i;
  const olasilik = us[en] / toplam;
  const sirali = [...us].sort((a, b) => b - a);
  const fark = sirali.length > 1 ? (sirali[0] - sirali[1]) / toplam : 1;
  if (olasilik < esik || fark < KARARSIZ_FARK) return { grupId: DIGER_ID, olasilik };
  return { grupId: gruplar[en].grupId, olasilik };
}

export const CIHAZ_ESIK = 0.98; // ekran kartı ile işlemci sonucu en az bu kadar benzemeli

/**
 * Ekran kartının verdiği vektörler, aynı test resimleri için işlemcinin verdiğiyle uyuşuyor mu?
 * Bazı sürücülerde ekran kartı hata vermeden her resme aynı sonucu döndürüyor; bunu yakalar.
 */
export function cihazTutarliMi(deneme: number[][], referans: number[][], esik = CIHAZ_ESIK): boolean {
  if (deneme.length !== referans.length || deneme.length === 0) return false;
  return deneme.every((v, i) => {
    const b = benzerlik(normalize(v), normalize(referans[i]));
    return Number.isFinite(b) && b >= esik;
  });
}
