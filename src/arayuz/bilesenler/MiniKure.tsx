import { useEffect, useRef } from 'react';

const BOYUT = 22; // ekranda px
const NOKTA = 90;

// Fibonacci küresi: noktalar yüzeye eşit dağılır (büyük küreyle aynı dil)
const NOKTALAR: [number, number, number][] = Array.from({ length: NOKTA }, (_, i) => {
  const y = 1 - (2 * (i + 0.5)) / NOKTA;
  const r = Math.sqrt(1 - y * y);
  const a = i * Math.PI * (3 - Math.sqrt(5));
  return [Math.cos(a) * r, y, Math.sin(a) * r];
});

/** Markanın yanındaki küçük, kendi etrafında dönen altın nokta küre. "Hareketi azalt" açıksa durur. */
export function MiniKure() {
  const tuval = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = tuval.current;
    const x = c?.getContext('2d');
    if (!c || !x) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = c.height = Math.round(BOYUT * dpr);
    x.scale(dpr, dpr);
    const azalt = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let id = 0;

    const ciz = (t: number) => {
      const aci = azalt ? 0.6 : t / 2600;
      const ca = Math.cos(aci);
      const sa = Math.sin(aci);
      const m = BOYUT / 2;
      const R = m - 2;
      x.clearRect(0, 0, BOYUT, BOYUT);
      for (const [px, py, pz] of NOKTALAR) {
        const x1 = px * ca + pz * sa;
        const z1 = -px * sa + pz * ca;
        const y2 = py * 0.94 - z1 * 0.34; // hafif öne eğik
        const z2 = py * 0.34 + z1 * 0.94;
        const derin = (z2 + 1) / 2;
        x.fillStyle = `rgba(250,204,21,${0.12 + derin * 0.88})`;
        x.beginPath();
        x.arc(m + x1 * R, m + y2 * R, 0.35 + derin * 0.6, 0, Math.PI * 2);
        x.fill();
      }
      if (!azalt) id = requestAnimationFrame(ciz);
    };
    id = requestAnimationFrame(ciz);
    return () => cancelAnimationFrame(id);
  }, []);

  return <canvas ref={tuval} className="mini-kure" style={{ width: BOYUT, height: BOYUT }} aria-hidden="true" />;
}
