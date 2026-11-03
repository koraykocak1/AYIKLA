import type { YilBolumu } from './gruplama';
import { ayAdi } from './bicim';

/** Izgara ölçüleri (px). Kartlar en az bu boyda; satır genişliğine yayılır. */
export const KART = {
  en: 160,
  boy: 112,
  etiket: 28, // kartın altındaki tarih + saat
  aralik: 14,
  yilBasligi: 66,
  ayBasligi: 38,
  ayArasi: 18,
} as const;

export interface KartYeri {
  anahtar: string;
  sira: number; // ızgaradaki sıra (büyük görünüm bu sırayla gezer)
  x: number;
  y: number;
}

export interface Baslik {
  tur: 'yil' | 'ay';
  metin: string;
  adet: number;
  y: number;
}

export interface IzgaraYerlesimi {
  kartlar: KartYeri[]; // y'ye göre sıralı
  basliklar: Baslik[];
  kartEn: number;
  kartBoy: number;
  yukseklik: number;
}

/** Yıl › ay bölümlerini satırlara dizer: her kartın, her başlığın yeri ve toplam yükseklik. */
export function izgaraYerlesimi(bolumler: YilBolumu[], genislik: number): IzgaraYerlesimi {
  const sutun = Math.max(1, Math.floor((genislik + KART.aralik) / (KART.en + KART.aralik)));
  const kartEn = Math.max(KART.en, (genislik - (sutun - 1) * KART.aralik) / sutun);
  const kartBoy = (kartEn * KART.boy) / KART.en;
  const satir = kartBoy + KART.etiket + KART.aralik;
  const kartlar: KartYeri[] = [];
  const basliklar: Baslik[] = [];
  let y = 0;
  let sira = 0;
  for (const yil of bolumler) {
    basliklar.push({ tur: 'yil', metin: String(yil.yil), adet: yil.aylar.reduce((t, a) => t + a.medya.length, 0), y });
    y += KART.yilBasligi;
    for (const ay of yil.aylar) {
      basliklar.push({ tur: 'ay', metin: ayAdi(ay.ay), adet: ay.medya.length, y });
      y += KART.ayBasligi;
      ay.medya.forEach((m, i) => {
        kartlar.push({ anahtar: m.anahtar, sira: sira++, x: (i % sutun) * (kartEn + KART.aralik), y: y + Math.floor(i / sutun) * satir });
      });
      y += Math.ceil(ay.medya.length / sutun) * satir + KART.ayArasi;
    }
  }
  return { kartlar, basliklar, kartEn, kartBoy, yukseklik: y };
}

/** [ust, alt] dikey aralığına giren kartların sıra aralığı [bas, son) (ikili arama; binlerce kartta hızlı). */
export function gorunenAralik(kartlar: KartYeri[], ust: number, alt: number, kartBoy: number): [number, number] {
  const ilk = (sinir: number) => {
    let a = 0;
    let b = kartlar.length;
    while (a < b) {
      const o = (a + b) >> 1;
      if (kartlar[o].y < sinir) a = o + 1;
      else b = o;
    }
    return a;
  };
  return [ilk(ust - kartBoy - KART.etiket), ilk(alt)];
}

export interface KureYeri {
  x: number; // merkeze göre (px)
  y: number;
  z: number; // -1 arka, +1 ön
  olcek: number; // perspektif büyüklüğü
}

/** i. kartın küre yüzeyindeki yeri: Fibonacci dizilişi, Y ekseninde `donus`, X ekseninde `egim` kadar çevrilmiş. */
export function kureYerlesimi(i: number, n: number, donus: number, egim: number, yaricap: number): KureYeri {
  const altin = Math.PI * (3 - Math.sqrt(5));
  const py = n <= 1 ? 0 : 1 - (2 * (i + 0.5)) / n;
  const r = Math.sqrt(Math.max(0, 1 - py * py));
  const a = i * altin;
  const px = Math.cos(a) * r;
  const pz = Math.sin(a) * r;
  const x1 = px * Math.cos(donus) + pz * Math.sin(donus);
  const z1 = -px * Math.sin(donus) + pz * Math.cos(donus);
  const y2 = py * Math.cos(egim) - z1 * Math.sin(egim);
  const z2 = py * Math.sin(egim) + z1 * Math.cos(egim);
  const olcek = 1 / (1 - z2 * 0.35);
  return { x: x1 * yaricap * olcek, y: y2 * yaricap * olcek, z: z2, olcek };
}
