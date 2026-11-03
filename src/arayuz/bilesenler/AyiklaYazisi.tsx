import { useRef } from 'react';
import { ayiklaYazisi as ay } from '../hareket';
import { it, useTuvalDongusu, type Itilen } from './tuvalDongusu';

const METIN = 'AYIKLA';
const YAZI_AILESI = 'Bahnschrift, "DIN Alternate", "Segoe UI", system-ui, sans-serif';

/** Yazıyı oluşturan bir zerrecik: (hx, hy) yerine yaylı oturur. */
interface Zerre extends Itilen {
  hx: number;
  hy: number;
  ton: number; // füme tonu
  boy: number; // boy çarpanı
  faz: number;
}

interface Yazi {
  anahtar: string;
  zerreler: Zerre[];
  zerreBoyu: number;
  alt: number; // yazının alt kenarı (yansıma çizgisi)
  yukseklik: number;
}

/** Yazıyı görünmez bir tuvale çizip dolu yerlerinden seyrek bir ızgarayla zerrecik toplar. */
function yaziyiKur(W: number, H: number): Yazi {
  const boy = Math.round(Math.min(W, H) * ay.boyOrani);
  const aralik = boy * ay.harfAraligi;
  const oc = document.createElement('canvas');
  const ow = Math.ceil(boy * 7);
  const oh = Math.ceil(boy * 1.3);
  oc.width = ow;
  oc.height = oh;
  const o = oc.getContext('2d', { willReadFrequently: true })!;
  o.font = `700 ${boy}px ${YAZI_AILESI}`;
  o.letterSpacing = `${aralik}px`;
  o.textBaseline = 'middle';
  o.fillStyle = '#fff';
  const en = o.measureText(METIN).width - aralik; // sondaki harf aralığı sayılmaz: tam ortada durur
  o.fillText(METIN, (ow - en) / 2, oh / 2);
  const veri = o.getImageData(0, 0, ow, oh).data;

  const sol = W / 2 - ow / 2;
  const ust = H * ay.merkezY - oh / 2;
  const adim = Math.max(3, boy * ay.aralikOrani);
  const zerreler: Zerre[] = [];
  let tepe = Infinity;
  let alt = -Infinity;
  for (let yy = adim / 2; yy < oh; yy += adim) {
    for (let xx = adim / 2; xx < ow; xx += adim) {
      if (veri[((yy | 0) * ow + (xx | 0)) * 4 + 3] > 128) {
        tepe = Math.min(tepe, ust + yy);
        alt = Math.max(alt, ust + yy);
        zerreler.push({
          hx: sol + xx,
          hy: ust + yy,
          // Belirirken yerine doğru toplanır
          ox: (Math.random() - 0.5) * 14,
          oy: (Math.random() - 0.5) * 14,
          vx: 0,
          vy: 0,
          ton: 185 + Math.random() * 35,
          boy: 0.75 + Math.random() * 0.45,
          faz: Math.random() * 10,
        });
      }
    }
  }
  if (!zerreler.length) tepe = alt = ust + oh / 2;
  return { anahtar: `${W}x${H}`, zerreler, zerreBoyu: Math.max(2, boy * ay.zerreOrani), alt, yukseklik: alt - tepe };
}

/**
 * Gruplar ile halka arasındaki "AYIKLA" (canvas 2B, C tarzı): çok kalın, seyrek iri füme zerreciklerden oluşur,
 * ~0.9 sn'de bütün olarak birden belirir; altında soluk ayna yansıması. Fare zerrecikleri dağıtır, geri toplanırlar.
 */
export function AyiklaYazisi() {
  const yazi = useRef<Yazi>(null);

  const tuval = useTuvalDongusu(({ x, W, H, dt, sn, fare, azalt }) => {
    if (yazi.current?.anahtar !== `${W}x${H}`) yazi.current = yaziyiKur(W, H);
    const { zerreler, zerreBoyu, alt, yukseklik } = yazi.current;
    // Küre aşağı inerken yolunu açar; yazı ondan sonra belirir
    const belir = azalt ? 1 : Math.min(Math.max(0, sn - ay.gecikme) / ay.belirme, 1);
    const t = azalt ? 0 : sn;
    const ayna = alt + zerreBoyu * 1.6; // yansımanın başladığı çizgi
    const derinlik = Math.max(1, yukseklik * 0.9);

    x.clearRect(0, 0, W, H);
    for (const z of zerreler) {
      if (azalt) {
        z.ox = 0;
        z.oy = 0;
      } else {
        it(z, z.hx, z.hy, fare, ay, dt);
      }
      const px = z.hx + z.ox;
      const py = z.hy + z.oy;
      const a = Math.min(1, (0.75 + 0.25 * Math.sin(t * 2 + z.faz)) * belir * 1.1);
      const b = zerreBoyu * z.boy;
      const ton = z.ton | 0;
      x.fillStyle = `rgba(${ton},${ton + 4},${ton + 10},${a})`;
      x.fillRect(px - b / 2, py - b / 2, b, b);

      // Ayna yansıması: aşağı doğru sönen ters kopya
      const ry = 2 * ayna - py;
      const sonme = 1 - (ry - ayna) / derinlik;
      if (sonme > 0) {
        x.fillStyle = `rgba(${ton},${ton + 4},${ton + 10},${a * ay.yansima * sonme})`;
        x.fillRect(px - b / 2, ry - b / 2, b, b);
      }
    }
  });

  return <canvas ref={tuval} className="ayiklama-tuval" aria-hidden="true" />;
}
