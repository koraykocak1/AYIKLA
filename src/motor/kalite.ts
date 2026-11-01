import sharp from 'sharp';
import type { KaliteSonucu } from './tipler';

export const BULANIK_ESIK = 80; // Laplace varyansı (256 px gri)
export const KARANLIK_ESIK = 28; // ortalama parlaklık (0-255)
/**
 * Ortalaması karanlık olsa da aydınlık bir bölgesi (ışıklar, aydınlatılmış bir kişi) olan fotoğraf
 * iyi bir gece fotoğrafıdır. Yalnızca en parlak %2'lik dilimi de bu değerin altında kalan,
 * yani gerçekten hiçbir şeyin seçilmediği fotoğraflar "karanlık" sayılır.
 * Gerçek arşivde eski kuralın elediği 45 gece fotoğrafının hepsinde bu değer ≥ 97 idi.
 */
export const AYDINLIK_ESIK = 60;

export async function kaliteOlc(onizleme: string): Promise<KaliteSonucu> {
  const { data, info } = await sharp(onizleme)
    .greyscale()
    .resize(256, 256, { fit: 'inside' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;

  let toplam = 0;
  const histogram = new Array<number>(256).fill(0);
  for (let i = 0; i < data.length; i++) {
    toplam += data[i];
    histogram[data[i]]++;
  }
  const parlaklik = toplam / data.length;
  // En parlak %2'lik dilimin başladığı değer
  let aydinlik = 255;
  for (let v = 255, sayilan = 0; v >= 0; v--) {
    sayilan += histogram[v];
    if (sayilan >= data.length * 0.02) {
      aydinlik = v;
      break;
    }
  }

  // Welford yöntemi: Laplace değerlerinin varyansı, tek geçişte
  let n = 0;
  let ort = 0;
  let m2 = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const l = 4 * data[i] - data[i - 1] - data[i + 1] - data[i - w] - data[i + w];
      n++;
      const fark = l - ort;
      ort += fark / n;
      m2 += fark * (l - ort);
    }
  }
  const netlik = n > 0 ? m2 / n : 0;
  const karanlik = parlaklik < KARANLIK_ESIK && aydinlik < AYDINLIK_ESIK;
  return { netlik, parlaklik, aydinlik, karanlik, bulanik: !karanlik && netlik < BULANIK_ESIK };
}
