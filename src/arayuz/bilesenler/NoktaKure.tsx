import { useEffect, useRef } from 'react';
import { kure, hareketiAzalt } from '../hareket';

interface Props {
  /** Klasör kürenin üstünde sürüklenirken noktalar daha parlak yanar. */
  parlak?: boolean;
  /**
   * Kürenin yeri ve yarıçapı (px), başlayalı geçen süreye (sn) göre. Verilmezse ekranın ortasında, büyük durur.
   * Ayıklamada küre bununla küçülüp aşağı iner.
   */
  yer?: (W: number, H: number, sn: number) => { x: number; y: number; r: number };
}

/** Bir noktanın küre üstündeki yeri (birim küre) ve fareyle itilince ekrandaki kayması. */
interface Nokta {
  x: number;
  y: number;
  z: number;
  ox: number; // ekranda yerinden kayma (px)
  oy: number;
  vx: number; // kayma hızı (px / kare)
  vy: number;
}

const SARI = [250, 204, 21];
const KREM = [255, 241, 205];

/** Fibonacci dizilişi: noktalar küre yüzeyine eşit aralıkla yayılır. */
function noktalariDiz(n: number): Nokta[] {
  const altin = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - (2 * (i + 0.5)) / n;
    const r = Math.sqrt(1 - y * y);
    const a = i * altin;
    return { x: Math.cos(a) * r, y, z: Math.sin(a) * r, ox: 0, oy: 0, vx: 0, vy: 0 };
  });
}

/**
 * Karşılamadaki büyük sarı noktalı küre (canvas 2B). Yavaş döner; fare noktaları uzay boşluğundaki gibi
 * ağır ağır dağıtır, noktalar yaylı olarak yerine döner. Hareket gerçek zamana bağlıdır.
 * Pencere gizliyken durur; "hareketi azalt" açıksa tek durağan kare çizilir.
 */
export function NoktaKure({ parlak = false, yer }: Props) {
  const tuval = useRef<HTMLCanvasElement>(null);
  const parlakRef = useRef(parlak);
  parlakRef.current = parlak;
  const yerRef = useRef(yer);
  yerRef.current = yer;

  useEffect(() => {
    const c = tuval.current;
    const x = c?.getContext('2d');
    if (!c || !x) return;
    const azalt = hareketiAzalt();
    const noktalar = noktalariDiz(kure.noktaSayisi);

    let W = 0;
    let H = 0;
    let sol = 0;
    let ust = 0;
    const boyutla = () => {
      const D = Math.min(devicePixelRatio || 1, 2);
      const k = c.getBoundingClientRect();
      W = k.width;
      H = k.height;
      sol = k.left;
      ust = k.top;
      c.width = W * D;
      c.height = H * D;
      x.setTransform(D, 0, 0, D, 0, 0);
    };
    boyutla();

    // Fare: tuvale göre yeri ve (yumuşatılmış) hızı
    const fare = { x: -1e4, y: -1e4, hiz: 0 };
    const fareyeGore = (e: PointerEvent) => {
      // Ekran geçişinde üst kap ölçeklenir; yeri her harekette tazele
      const k = c.getBoundingClientRect();
      sol = k.left;
      ust = k.top;
      const nx = e.clientX - sol;
      const ny = e.clientY - ust;
      if (fare.x > -1e3) fare.hiz = Math.min(fare.hiz + Math.hypot(nx - fare.x, ny - fare.y) * 0.5, 120);
      fare.x = nx;
      fare.y = ny;
    };
    const fareCikti = () => {
      fare.x = -1e4;
      fare.y = -1e4;
    };

    let aci = 0;
    const baslangic = performance.now();
    let son = baslangic;
    let istek = 0;

    const ciz = (dt: number) => {
      x.clearRect(0, 0, W, H);
      // Hareketi azaltta küre doğrudan son yerinde durur
      const konum = yerRef.current?.(W, H, azalt ? Infinity : (performance.now() - baslangic) / 1000);
      const R = konum?.r ?? Math.min(W, H) * kure.yaricapOrani;
      const mx = konum?.x ?? W / 2;
      const my = konum?.y ?? H / 2;
      const ca = Math.cos(aci);
      const sa = Math.sin(aci);
      const ce = Math.cos(kure.egim);
      const se = Math.sin(kure.egim);
      const itR = kure.itmeYaricapi;
      const itme = (kure.itmeGucu + fare.hiz * kure.hizEtkisi) * dt;
      const yay = kure.donusYayi * dt;
      const surt = kure.surtunme ** dt;
      const isik = parlakRef.current ? 1.35 : 1;

      for (const n of noktalar) {
        // Y ekseninde dönüş, sonra hafif öne eğim
        const x1 = n.x * ca + n.z * sa;
        const z1 = -n.x * sa + n.z * ca;
        const y2 = n.y * ce - z1 * se;
        const z2 = n.y * se + z1 * ce; // +1 bize en yakın
        const p = 1 + z2 * 0.12; // hafif derinlik
        const ex = mx + x1 * R * p;
        const ey = my + y2 * R * p;

        if (dt > 0) {
          // Fare yakınsa it (öndeki noktalar daha çok etkilenir)
          const dx = ex + n.ox - fare.x;
          const dy = ey + n.oy - fare.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < itR * itR) {
            const d = Math.sqrt(d2) || 1;
            const g = (1 - d / itR) * itme * (0.4 + 0.6 * (z2 + 1) * 0.5);
            n.vx += (dx / d) * g;
            n.vy += (dy / d) * g;
          }
          // Yaylı dönüş + ağır sürtünme
          n.vx = (n.vx - n.ox * yay) * surt;
          n.vy = (n.vy - n.oy * yay) * surt;
          n.ox += n.vx * dt;
          n.oy += n.vy * dt;
        }

        const uzak = Math.min(Math.hypot(n.ox, n.oy) / kure.buyumeMesafesi, 1);
        const derin = (z2 + 1) / 2; // 0 arka, 1 ön
        const a = Math.min((0.12 + derin * 0.78) * isik, 1);
        const r = (0.7 + derin * 0.9) * (1 + uzak * 0.9);
        const renk = SARI.map((s, i) => Math.round(s + (KREM[i] - s) * uzak));
        x.fillStyle = `rgba(${renk[0]},${renk[1]},${renk[2]},${a})`;
        x.beginPath();
        x.arc(ex + n.ox, ey + n.oy, r, 0, Math.PI * 2);
        x.fill();
      }
      fare.hiz *= 0.9 ** dt;
    };

    const kare = (simdi: number) => {
      const dt = Math.min(Math.max((simdi - son) / 16.667, 0), 3); // 60 fps'e göre kare oranı
      son = simdi;
      aci += (kure.donusHizi * dt) / 60;
      ciz(dt);
      istek = requestAnimationFrame(kare);
    };
    const baslat = () => {
      cancelAnimationFrame(istek);
      son = performance.now();
      istek = requestAnimationFrame(kare);
    };
    const gorunurluk = () => (document.hidden ? cancelAnimationFrame(istek) : baslat());
    const gozlemci = new ResizeObserver(() => {
      boyutla();
      if (azalt) ciz(0);
    });
    gozlemci.observe(c);

    if (azalt) {
      ciz(0);
    } else {
      addEventListener('pointermove', fareyeGore);
      document.addEventListener('pointerleave', fareCikti);
      document.addEventListener('visibilitychange', gorunurluk);
      baslat();
    }
    return () => {
      cancelAnimationFrame(istek);
      gozlemci.disconnect();
      removeEventListener('pointermove', fareyeGore);
      document.removeEventListener('pointerleave', fareCikti);
      document.removeEventListener('visibilitychange', gorunurluk);
    };
  }, []);

  return <canvas ref={tuval} className="nokta-kure" aria-hidden="true" />;
}
