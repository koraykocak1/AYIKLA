/**
 * Ayıklama sahnesinin yerleşimi. Dünya koordinatları: y ∈ [-10, 10], x ∈ [-10·en, 10·en]
 * (en = ekran genişliği / yüksekliği). Ortada dönen yığın, çevresinde bir elips üzerinde grup bölgeleri,
 * sağ altta Elenecekler köşesi.
 */
export interface Nokta {
  x: number;
  y: number;
}

const ALTIN_ACI = 2.399963; // radyan; kartlar üst üste binmeden sarmal dizilir

export function grupMerkezi(i: number, n: number, en: number): Nokta {
  const aci = Math.PI / 2 - (2 * Math.PI * i) / Math.max(n, 1); // üstten başlar, saat yönünde
  return { x: Math.cos(aci) * 7 * en, y: Math.sin(aci) * 5.4 };
}

export function ELENECEK_KOSESI(en: number): Nokta {
  return { x: 8.4 * en, y: -8.2 };
}

/** Yığındaki i. kartın yeri: merkezde, `aci` ile dönen bir sarmal. z: derinlik (0–1). */
export function yiginKonumu(i: number, toplam: number, aci: number): Nokta & { z: number } {
  const t = toplam <= 1 ? 0 : i / (toplam - 1);
  const r = 0.4 + 2.6 * Math.sqrt(t);
  const a = aci + i * ALTIN_ACI;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r, z: t };
}

/** Grubuna ulaşan k. kartın yeri: grup merkezinin çevresinde sıkı bir sarmal küme (300 karttan sonra üst üste biner). */
export function kumeKonumu(merkez: Nokta, k: number): Nokta {
  const j = k % 300;
  const r = 0.12 * Math.sqrt(j);
  const a = j * ALTIN_ACI;
  return { x: merkez.x + Math.cos(a) * r, y: merkez.y + Math.sin(a) * r };
}

/** Dünya noktasını ekranda yüzde konuma çevirir (HTML etiketleri için). */
export function yuzde(n: Nokta, en: number): { sol: number; ust: number } {
  return { sol: ((n.x / (10 * en) + 1) / 2) * 100, ust: ((1 - n.y / 10) / 2) * 100 };
}

/** Grup etiketinin yazı boyu (px): grup büyüdükçe büyür. */
export function etiketBoyu(adet: number): number {
  return 13 + Math.min(15, Math.sqrt(adet) * 1.1);
}

/** Grup etiketinin alt kenarının yeri: kümenin o anki büyüklüğüne göre hemen üstünde (kartları örtmez). */
export function etiketNoktasi(merkez: Nokta, adet: number): Nokta {
  return { x: merkez.x, y: merkez.y + 0.5 + 0.12 * Math.sqrt(Math.min(adet, 300)) };
}
