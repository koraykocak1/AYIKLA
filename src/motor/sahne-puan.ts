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

/** CLIP usulü: benzerlik ×100 → softmax. Kararsız veya zayıf eşleşme "Diğer" olur. */
export function grupSec(resim: number[], gruplar: GrupVektoru[], esik = DIGER_ESIK): { grupId: string; olasilik: number } {
  if (gruplar.length === 0) return { grupId: DIGER_ID, olasilik: 0 };
  const puanlar = gruplar.map((g) => 100 * Math.max(...g.vektorler.map((t) => benzerlik(resim, t))));
  const enBuyuk = Math.max(...puanlar);
  const us = puanlar.map((p) => Math.exp(p - enBuyuk));
  const toplam = us.reduce((a, b) => a + b, 0);
  let en = 0;
  for (let i = 1; i < us.length; i++) if (us[i] > us[en]) en = i;
  const olasilik = us[en] / toplam;
  const sirali = [...us].sort((a, b) => b - a);
  const fark = sirali.length > 1 ? (sirali[0] - sirali[1]) / toplam : 1;
  if (olasilik < esik || fark < KARARSIZ_FARK) return { grupId: DIGER_ID, olasilik };
  return { grupId: gruplar[en].grupId, olasilik };
}
