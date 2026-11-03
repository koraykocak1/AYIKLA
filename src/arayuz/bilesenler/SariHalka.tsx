import { useRef, type RefObject } from 'react';
import { halka } from '../hareket';
import { halkaYeri, type AyiklamaSahnesi } from '../mantik/sahneDuzeni';
import { it, itilen, useTuvalDongusu, type Itilen } from './tuvalDongusu';

const TAM = Math.PI * 2;

/** Halkanın çevresinde titreşen bir neon tel. */
interface Tel {
  tohum: number;
  hiz: number; // dalganın akış hızı
  genlik: number; // titreşim çarpanı
  parlaklik: number; // 0–1
  noktalar: Itilen[];
}

/** Halkanın kenarından dışarı kıvrılıp sönen alev dili. */
interface Kivrim {
  aci: number;
  yas: number; // sn
  omur: number; // sn
  boy: number; // px
  bukum: number;
  tohum: number;
  noktalar: Itilen[];
}

/** Birkaç sinüsün toplamı: pürüzsüz, organik dalga. */
function dalga(a: number, t: number, s: number): number {
  return (
    Math.sin(a * 3 + t * 1.3 + s) * 0.5 +
    Math.sin(a * 7 - t * 2.1 + s * 1.7) * 0.28 +
    Math.sin(a * 13 + t * 3.2 + s * 2.3) * 0.14 +
    Math.sin(a * 2 - t * 0.7 + s * 0.4) * 0.6
  );
}

function telleriKur(): Tel[] {
  return Array.from({ length: halka.telSayisi }, (_, s) => ({
    tohum: s * 1.37 + Math.random(),
    hiz: 0.6 + Math.random() * 1.4,
    genlik: 0.5 + Math.random() * 1.1,
    parlaklik: 0.25 + Math.random() * 0.75,
    noktalar: Array.from({ length: halka.telNoktasi + 1 }, itilen),
  }));
}

function yeniKivrim(R: number): Kivrim {
  // Çoğu sağ yandan, bir kısmı karşı yandan çıkar
  const aci = -0.6 + Math.random() * 1.6 + (Math.random() < 0.35 ? Math.PI : 0);
  return {
    aci,
    yas: 0,
    omur: 1.6 + Math.random() * 1.8,
    boy: R * (0.25 + Math.random() * 0.45),
    bukum: (Math.random() - 0.5) * 2.6,
    tohum: Math.random() * 10,
    noktalar: Array.from({ length: 40 }, itilen),
  };
}

/** Üç katmanlı yumuşak neon çizgi: geniş soluk ışıma, orta ışık, ince parlak çekirdek. */
function neon(x: CanvasRenderingContext2D, yol: number[][], kalinlik: number, isik: number, alfa: number) {
  if (yol.length < 2 || alfa <= 0.003) return;
  x.beginPath();
  x.moveTo(yol[0][0], yol[0][1]);
  for (let i = 1; i < yol.length - 1; i++) {
    const ox = (yol[i][0] + yol[i + 1][0]) / 2;
    const oy = (yol[i][1] + yol[i + 1][1]) / 2;
    x.quadraticCurveTo(yol[i][0], yol[i][1], ox, oy);
  }
  const son = yol[yol.length - 1];
  x.lineTo(son[0], son[1]);
  x.strokeStyle = `rgba(250,190,20,${alfa * 0.06})`;
  x.lineWidth = kalinlik * 9;
  x.stroke();
  x.strokeStyle = `rgba(250,204,21,${alfa * 0.18})`;
  x.lineWidth = kalinlik * 3.2;
  x.stroke();
  x.strokeStyle = `rgba(255,${(230 + isik * 20) | 0},${(150 + isik * 90) | 0},${alfa})`;
  x.lineWidth = kalinlik;
  x.stroke();
}

/**
 * Ortadaki sarı enerji halkası (canvas 2B): ortada biraz içten dışa açılıp parlayarak belirir (1.4 sn),
 * 11 ince neon tel titreşir, kenarlardan alev kıvrımları çıkar; fare telleri uzay boşluğundaki gibi iter.
 */
export function SariHalka({ sahne }: { sahne: RefObject<AyiklamaSahnesi> }) {
  const teller = useRef<Tel[]>(null);
  const kivrimlar = useRef<Kivrim[]>([]);

  const tuval = useTuvalDongusu(({ x, W, H, dt, sn, fare, azalt }) => {
    teller.current ??= telleriKur();
    const t = azalt ? 0 : sn; // hareketi azaltta dalgalar durur
    const { x: cx, y: cy, r: R } = halkaYeri(W, H, sahne.current.ilerleme);
    const dogus = azalt ? 1 : Math.min(sn / halka.dogus, 1);
    const acilma = 1 - (1 - dogus) ** 3;

    x.globalCompositeOperation = 'source-over';
    x.clearRect(0, 0, W, H);
    x.globalCompositeOperation = 'lighter';

    // Doğuşta ortadan yayılan kısa parlama
    if (dogus < 1) {
      const p = Math.sin(Math.PI * dogus) * 0.35;
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, R * 1.4);
      g.addColorStop(0, `rgba(250,204,21,${p * 0.25})`);
      g.addColorStop(0.7, `rgba(250,204,21,${p})`);
      g.addColorStop(1, 'rgba(250,204,21,0)');
      x.fillStyle = g;
      x.fillRect(cx - R * 1.4, cy - R * 1.4, R * 2.8, R * 2.8);
    }

    const bas = Math.PI * 0.85;
    for (const tel of teller.current) {
      const yol: number[][] = [];
      const nefes = 1 + Math.sin(t * 1.1 + tel.tohum) * 0.015;
      for (let i = 0; i <= halka.telNoktasi; i++) {
        const a = bas + (i / halka.telNoktasi) * TAM;
        const r = R * (0.55 + 0.45 * acilma) * nefes + dalga(a, t * tel.hiz, tel.tohum) * R * halka.dalga * tel.genlik;
        const bx = cx + Math.cos(a) * r;
        const by = cy + Math.sin(a) * r;
        const p = tel.noktalar[i];
        it(p, bx, by, fare, halka, dt);
        yol.push([bx + p.ox, by + p.oy]);
      }
      const titrek = azalt ? 0.8 : 0.55 + 0.45 * Math.sin(t * 2.3 + tel.tohum * 3);
      neon(x, yol, 0.55 + tel.parlaklik * 0.7, tel.parlaklik, (0.35 + tel.parlaklik * 0.55) * titrek * acilma);
    }

    if (azalt) return;
    const sure = dt / 60;
    if (dogus >= 1 && kivrimlar.current.length < halka.kivrimEnFazla && Math.random() < halka.kivrimSikligi * sure) {
      kivrimlar.current.push(yeniKivrim(R));
    }
    kivrimlar.current = kivrimlar.current.filter((k) => {
      k.yas += sure;
      const u = k.yas / k.omur;
      if (u >= 1) return false;
      const alfa = Math.sin(Math.PI * u);
      const yol: number[][] = [];
      for (let i = 0; i < k.noktalar.length; i++) {
        const v = i / (k.noktalar.length - 1);
        const uz = k.boy * v * (0.4 + u * 0.8);
        const a = k.aci + v * k.bukum * 0.5 + Math.sin(v * 5 + t * 2 + k.tohum) * 0.12 * v;
        const r = R + uz;
        const bx = cx + Math.cos(a) * r + Math.sin(v * 8 + t * 3 + k.tohum) * 6 * v;
        const by = cy + Math.sin(a) * r + Math.cos(v * 7 + t * 2.5 + k.tohum) * 6 * v - uz * 0.25 * v;
        const p = k.noktalar[i];
        it(p, bx, by, fare, halka, dt);
        yol.push([bx + p.ox, by + p.oy]);
      }
      neon(x, yol, 0.6, 0.2, 0.55 * alfa);
      // İnce ikinci dil: alevin çatallanması
      neon(
        x,
        yol.map((q, i) => [q[0] + Math.sin(i * 0.4 + t * 3) * 2.5, q[1] + Math.cos(i * 0.3 + t * 2) * 2.5]),
        0.35,
        0,
        0.35 * alfa,
      );
      return true;
    });
  }, 1.5);

  return <canvas ref={tuval} className="ayiklama-tuval" aria-hidden="true" />;
}
