import { useEffect, useRef } from 'react';
import { hareketiAzalt } from '../hareket';

const BOYUT = 24; // ekranda px
const YILDIZ = 4;

/** Dört köşeli parıltı yıldızı (ortası şişkin, uçları ince). */
function yildiz(x: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const i = r * 0.28;
  x.beginPath();
  x.moveTo(cx, cy - r);
  x.quadraticCurveTo(cx + i, cy - i, cx + r, cy);
  x.quadraticCurveTo(cx + i, cy + i, cx, cy + r);
  x.quadraticCurveTo(cx - i, cy + i, cx - r, cy);
  x.quadraticCurveTo(cx - i, cy - i, cx, cy - r);
  x.fill();
}

/**
 * Markanın yanındaki küçük işaret: eğik bir halka üzerinde dönen, parıldayan 4 beyaz yıldız.
 * Arkadaki yıldızlar küçük ve soluk, öndekiler büyük ve parlak (3D derinlik). "Hareketi azalt" açıksa durur.
 */
export function MiniKure() {
  const tuval = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = tuval.current;
    const x = c?.getContext('2d');
    if (!c || !x) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = c.height = Math.round(BOYUT * dpr);
    x.scale(dpr, dpr);
    const azalt = hareketiAzalt();
    let id = 0;

    const ciz = (t: number) => {
      const zaman = azalt ? 0 : t / 1000;
      const m = BOYUT / 2;
      x.clearRect(0, 0, BOYUT, BOYUT);
      // Önce arkadakiler çizilsin diye derinliğe göre sırala
      const liste = Array.from({ length: YILDIZ }, (_, k) => {
        const a = zaman * 0.9 + (k / YILDIZ) * Math.PI * 2;
        const z = Math.sin(a); // -1 arka, +1 ön
        return { px: m + Math.cos(a) * (m - 4), py: m + z * 3.2 - Math.cos(a) * 1.5, z, k };
      }).sort((p, q) => p.z - q.z);
      for (const { px, py, z, k } of liste) {
        const derin = (z + 1) / 2;
        const parilti = azalt ? 1 : 0.75 + 0.25 * Math.sin(zaman * 3.1 + k * 1.7);
        x.fillStyle = `rgba(255,255,255,${(0.35 + derin * 0.65) * parilti})`;
        x.shadowColor = 'rgba(255,255,255,0.9)';
        x.shadowBlur = 2 + derin * 4;
        yildiz(x, px, py, (1.6 + derin * 2.6) * parilti);
      }
      if (!azalt) id = requestAnimationFrame(ciz);
    };
    id = requestAnimationFrame(ciz);
    return () => cancelAnimationFrame(id);
  }, []);

  return <canvas ref={tuval} className="mini-kure" style={{ width: BOYUT, height: BOYUT }} aria-hidden="true" />;
}
