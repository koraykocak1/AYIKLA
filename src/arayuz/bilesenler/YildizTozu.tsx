import { useRef, type RefObject } from 'react';
import { toz } from '../hareket';
import {
  bekleyenSayisi,
  enBuyukYaricap,
  grupYeri,
  halkaYeri,
  kuyruktanAl,
  type AyiklamaSahnesi,
  type SahneGrubu,
} from '../mantik/sahneDuzeni';
import { useTuvalDongusu } from './tuvalDongusu';

const TAM = Math.PI * 2;

/** Yoldaki bir toz bulutu: `n` fotoğrafı halkadan (ya da bir küreden) hedef grubuna taşır. */
interface Toz {
  hedef: number; // grup sırası
  kaynak: number; // -1: halkadan kalkar
  n: number;
  gri: boolean;
  aci: number; // halkadan koptuğu açı
  u: number; // 0–1 yol
  hiz: number; // yolculuk süresi çarpanı
  zerreler: { x: number; y: number; parlak: number; faz: number }[];
}

const yumusak = (u: number) => 0.5 - Math.cos(Math.PI * u) / 2;

/**
 * Halkadan kopan yıldız tozu (canvas 2B): her fotoğraf (ya da hızlı akışta birkaç fotoğraf) küçük bir sarı toz bulutu
 * olarak sarmal çizip ≈4–5 sn'de grubunun küresine süzülür; elenecekler gri. Varınca kürenin sayısı artar.
 * Hareketi azaltta toz uçmaz, sayılar doğrudan kürelere geçer.
 */
export function YildizTozu({ sahne, gruplar }: { sahne: RefObject<AyiklamaSahnesi>; gruplar: SahneGrubu[] }) {
  const tozlar = useRef<Toz[]>([]);
  const sonKalkis = useRef(-1);

  const tuval = useTuvalDongusu(({ x, W, H, dt, sn, azalt }) => {
    const s = sahne.current;
    const sira = (id: string) => Math.max(0, gruplar.findIndex((g) => g.id === id));
    x.clearRect(0, 0, W, H);

    if (azalt) {
      for (let b = kuyruktanAl(s, Infinity); b; b = kuyruktanAl(s, Infinity)) {
        if (b.kaynak) s.gelen[b.kaynak] = (s.gelen[b.kaynak] ?? 0) - b.n;
        s.gelen[b.grup] = (s.gelen[b.grup] ?? 0) + b.n;
      }
      s.ucan = 0;
      return;
    }

    // Kalkış: aynı anda uçan toz sınırlı; bekleyen çoksa her toz birkaç fotoğraf taşır
    for (let k = 0; k < 3 && tozlar.current.length < toz.enFazla && sn - sonKalkis.current >= toz.aralik; k++) {
      const paket = Math.max(1, Math.ceil(bekleyenSayisi(s) / toz.paketBolen));
      const b = kuyruktanAl(s, paket);
      if (!b) break;
      if (b.kaynak) s.gelen[b.kaynak] = (s.gelen[b.kaynak] ?? 0) - b.n; // kopya: küresinden ayrılır
      const hedef = sira(b.grup);
      tozlar.current.push({
        hedef,
        kaynak: b.kaynak ? sira(b.kaynak) : -1,
        n: b.n,
        gri: !!gruplar[hedef]?.elenecek,
        aci: Math.random() * TAM,
        u: 0,
        hiz: 0.85 + Math.random() * 0.3,
        zerreler: Array.from({ length: toz.zerre }, () => ({
          x: (Math.random() - 0.5) * 10,
          y: (Math.random() - 0.5) * 10,
          parlak: 0.3 + Math.random() * 0.7,
          faz: Math.random() * TAM,
        })),
      });
      sonKalkis.current = sn;
    }

    const halka = halkaYeri(W, H, s.ilerleme);
    const kureR = enBuyukYaricap(gruplar.length, W, H);
    x.globalCompositeOperation = 'lighter';
    tozlar.current = tozlar.current.filter((o) => {
      o.u = Math.min(1, o.u + dt / 60 / (toz.yolculuk * o.hiz));
      const e = yumusak(o.u);
      const hedef = grupYeri(o.hedef, gruplar.length, W, H);
      const bas =
        o.kaynak < 0
          ? { x: halka.x + Math.cos(o.aci) * halka.r, y: halka.y + Math.sin(o.aci) * halka.r }
          : grupYeri(o.kaynak, gruplar.length, W, H);
      // Sarmal: yolun ortasında en geniş, uçlarda daralır
      const a = e * Math.PI * 3 + o.aci;
      const genis = W * toz.sarmal * Math.sin(Math.PI * Math.min(e * 1.1, 1)) * (o.kaynak < 0 ? 1 : 0.4);
      const qx = bas.x + Math.cos(a) * genis * 0.5 + (hedef.x - bas.x) * e * e;
      const qy = bas.y + (hedef.y - bas.y) * e + Math.sin(a) * genis * 0.08;
      const yayil = (1 + Math.sin(Math.PI * e) * 1.8) * (1 + Math.log2(o.n) * 0.25);
      const sol = o.u < 0.08 ? o.u / 0.08 : o.u > 0.9 ? (1 - o.u) / 0.1 : 1;
      const renk = o.gri ? '170,170,170' : '250,204,21';

      const isik = 8.4 * yayil;
      const g = x.createRadialGradient(qx, qy, 0, qx, qy, isik);
      g.addColorStop(0, `rgba(${renk},${0.18 * sol})`);
      g.addColorStop(1, `rgba(${renk},0)`);
      x.fillStyle = g;
      x.fillRect(qx - isik, qy - isik, isik * 2, isik * 2);
      x.fillStyle = o.gri ? `rgba(200,200,200,${sol})` : `rgba(255,236,140,${sol})`;
      for (const z of o.zerreler) {
        const zx = qx + (z.x + Math.sin(sn * 2 + z.faz) * 2) * yayil;
        const zy = qy + (z.y + Math.cos(sn * 1.7 + z.faz) * 2) * yayil;
        x.globalAlpha = z.parlak;
        x.beginPath();
        x.arc(zx, zy, 0.75, 0, TAM);
        x.fill();
      }
      x.globalAlpha = 1;
      x.fillStyle = o.gri ? `rgba(220,220,220,${0.9 * sol})` : `rgba(255,248,200,${0.9 * sol})`;
      x.beginPath();
      x.arc(qx, qy, 1.1, 0, TAM);
      x.fill();

      // Küreye değince var sayılır (kürenin içinde sönerek kaybolur)
      if (o.u >= 1 || (o.u > 0.85 && Math.hypot(qx - hedef.x, qy - hedef.y) < kureR * 0.5)) {
        const id = gruplar[o.hedef]?.id;
        if (id) s.gelen[id] = (s.gelen[id] ?? 0) + o.n;
        return false;
      }
      return true;
    });
    x.globalCompositeOperation = 'source-over';
    s.ucan = tozlar.current.length;
  });

  return <canvas ref={tuval} className="ayiklama-tuval" aria-hidden="true" />;
}
