/**
 * Hareket değerleri tek yerde: süreler (sn), eğriler ve yaylar. Bileşenler sayı yazmaz, buradan alır.
 * Kural: yalnızca transform ve opacity (gerekirse filter) canlandırılır; "azaltılmış hareket"
 * tercihinde Motion dönüşümleri kendisi kapatır (App'teki MotionConfig), CSS'te ayrıca kapatılır.
 */
export const sure = {
  anlik: 0.08,
  hizli: 0.18,
  normal: 0.35,
  yavas: 0.6,
  sinematik: 0.9,
} as const;

export const egri = {
  yumusak: [0.22, 1, 0.36, 1] as [number, number, number, number],
  keskin: [0.4, 0, 0.2, 1] as [number, number, number, number],
  cikis: [0.4, 0, 1, 1] as [number, number, number, number],
};

export const yay = {
  canli: { type: 'spring', stiffness: 300, damping: 30 },
  yumusak: { type: 'spring', stiffness: 120, damping: 16 },
  zipla: { type: 'spring', stiffness: 420, damping: 14 },
  sayac: { stiffness: 90, damping: 20, restDelta: 0.5 },
} as const;

/** Sıralı giriş gecikmesi: ilk birkaç öğe sırayla gelir, gerisi beklemez (binlerce öğede gecikme birikmesin). */
export function siraliGecikme(i: number, adim = 0.03, ust = 24): number {
  return Math.min(i, ust) * adim;
}
