import { useEffect, useRef } from 'react';
import { kor, hareketiAzalt } from '../hareket';

interface Kivilcim {
  x: number;
  y: number;
  z: number; // derinlik: 0 uzak/soluk, 1 yakın/parlak
  vx: number;
  vy: number;
  tohum: number;
  yas: number;
  omur: number;
  renk: number;
}

/**
 * Tüm ekranların altındaki kor kıvılcımları: sıcak siyah zemin, yukarı süzülen turuncu-altın kıvılcımlar.
 * Hareket gerçek zamana bağlıdır (kare hızından bağımsız). Pencere gizliyken durur;
 * "hareketi azalt" açıksa tek bir durağan kare çizilir.
 */
export function KorArkaPlan() {
  const tuval = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = tuval.current;
    const x = c?.getContext('2d');
    if (!c || !x) return;
    const azalt = hareketiAzalt();
    let W = 0;
    let H = 0;
    const boyutla = () => {
      const D = Math.min(devicePixelRatio || 1, 1.5);
      W = innerWidth;
      H = innerHeight;
      c.width = W * D;
      c.height = H * D;
      x.setTransform(D, 0, 0, D, 0, 0);
    };
    boyutla();

    const yeni = (ilk: boolean): Kivilcim => {
      const z = 0.15 + Math.random() ** 1.6 * 0.85;
      return {
        x: Math.random() * W,
        y: ilk ? Math.random() * H : H + 10 + Math.random() * 60,
        z,
        vx: 0,
        vy: -(0.25 + Math.random() * 0.9) * z * 1.6,
        tohum: Math.random() * 100,
        yas: 0,
        omur: 400 + Math.random() * 900,
        renk: Math.random(),
      };
    };
    const K = Array.from({ length: kor.sayi }, () => yeni(true));
    const fare = { x: -1e4, y: -1e4 };
    const fareyeGore = (e: PointerEvent) => {
      fare.x = e.clientX;
      fare.y = e.clientY;
    };

    let t = 0;
    let ruzgar = 0;
    let ruzgarHedef = 0;
    let son = performance.now();
    let istek = 0;

    const ciz = (dt: number) => {
      const zemin = x.createRadialGradient(W * 0.55, H * 1.05, 0, W * 0.55, H * 1.05, Math.max(W, H));
      zemin.addColorStop(0, '#1a0904');
      zemin.addColorStop(0.45, '#0b0402');
      zemin.addColorStop(1, '#030101');
      x.globalCompositeOperation = 'source-over';
      x.fillStyle = zemin;
      x.fillRect(0, 0, W, H);
      x.globalCompositeOperation = 'lighter';
      x.lineCap = 'round';
      const r2 = kor.itmeYaricapi * kor.itmeYaricapi;
      for (let i = 0; i < K.length; i++) {
        const k = K[i];
        k.yas += dt;
        // yumuşak türbülans + ara sıra esinti
        const tx = Math.sin(k.y * 0.006 + t * 0.7 + k.tohum) * 0.35 + Math.sin(k.y * 0.017 - t * 1.3 + k.tohum * 2) * 0.18;
        const ty = Math.cos(k.x * 0.005 + t * 0.5 + k.tohum) * 0.12;
        k.vx += (tx + ruzgar) * 0.02 * k.z * dt;
        k.vy += (ty * 0.01 - 0.002) * k.z * dt;
        // fare yaklaşınca kıvılcım kenara kayar
        const dx = k.x - fare.x;
        const dy = k.y - fare.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < r2) {
          const d = Math.sqrt(d2) || 1;
          const g = (1 - d / kor.itmeYaricapi) * kor.itmeGucu * k.z * dt;
          k.vx += (dx / d) * g;
          k.vy += (dy / d) * g;
        }
        k.vx *= 0.985 ** dt;
        k.vy *= 0.995 ** dt;
        k.x += k.vx * dt;
        k.y += k.vy * dt;
        const oran = k.yas / k.omur;
        const sonme = oran < 0.1 ? oran / 0.1 : Math.max(0, 1 - (oran - 0.6) / 0.4);
        const kirpma = 0.55 + 0.45 * Math.sin(t * (6 + (k.tohum % 5)) + k.tohum);
        const a = sonme * kirpma * (0.25 + k.z * 0.75) * 0.8;
        if (a <= 0 || k.y < -30 || k.x < -30 || k.x > W + 30 || oran >= 1) {
          K[i] = yeni(false);
          continue;
        }
        const hiz = Math.hypot(k.vx, k.vy) || 1;
        const iz = hiz * (2 + k.z * 5);
        const g = (150 + k.renk * 80) | 0;
        const b = (30 + k.renk * 40) | 0;
        x.beginPath();
        x.moveTo(k.x, k.y);
        x.lineTo(k.x - (k.vx / hiz) * iz, k.y - (k.vy / hiz) * iz);
        x.strokeStyle = `rgba(255,${g},${b},${a * 0.18})`;
        x.lineWidth = (0.8 + k.z * 2.6) * 2.2;
        x.stroke();
        x.strokeStyle = `rgba(255,${g + 30},${b + 60},${a})`;
        x.lineWidth = 0.5 + k.z * 1.3;
        x.stroke();
      }
    };

    const kare = (simdi: number) => {
      const dt = Math.min(Math.max((simdi - son) / 16.667, 0), 3);
      son = simdi;
      t += dt / 60;
      if (Math.random() < kor.esintiOlasiligi * dt) ruzgarHedef = (Math.random() - 0.5) * 1.6;
      ruzgarHedef *= 0.995 ** dt;
      ruzgar += (ruzgarHedef - ruzgar) * 0.01 * dt;
      ciz(dt);
      istek = requestAnimationFrame(kare);
    };
    const baslat = () => {
      cancelAnimationFrame(istek);
      son = performance.now();
      istek = requestAnimationFrame(kare);
    };
    const gorunurluk = () => (document.hidden ? cancelAnimationFrame(istek) : baslat());
    const yenidenBoyutla = () => {
      boyutla();
      if (azalt) ciz(0);
    };

    addEventListener('resize', yenidenBoyutla);
    if (azalt) {
      ciz(0);
    } else {
      addEventListener('pointermove', fareyeGore);
      document.addEventListener('visibilitychange', gorunurluk);
      baslat();
    }
    return () => {
      cancelAnimationFrame(istek);
      removeEventListener('resize', yenidenBoyutla);
      removeEventListener('pointermove', fareyeGore);
      document.removeEventListener('visibilitychange', gorunurluk);
    };
  }, []);

  return <canvas ref={tuval} className="kor-arka" aria-hidden="true" />;
}
