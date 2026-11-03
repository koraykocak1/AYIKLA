import { useEffect, useRef } from 'react';

/** Farenin tuvale göre yeri ve son karedeki kayması. Fare yokken `var` false. */
export interface Fare {
  var: boolean;
  x: number;
  y: number;
  vx: number; // son karedeki kayma (px)
  vy: number;
  hiz: number; // kaymanın boyu, en çok 30
}

/** Her karede çizim işlevine verilen bilgiler. */
export interface Kare {
  x: CanvasRenderingContext2D;
  W: number;
  H: number;
  /** Geçen süre, 60 kare/sn'lik kare cinsinden (hareketi azaltta 0). Fizik değerleri bununla ölçeklenir. */
  dt: number;
  /** Döngü başlayalı geçen gerçek süre (sn). */
  sn: number;
  fare: Fare;
  azalt: boolean;
}

const AZALT_ARALIGI = 250; // hareketi azaltta yalnız veri değişimini göstermek için seyrek yeniden çizim (ms)

/**
 * Tam ekran bir tuvali her karede çizer. Süre gerçek zamana (performance.now) bağlıdır; pencere gizliyken durur;
 * sistemde "hareketi azalt" açıksa hareket yoktur (dt = 0), tuval yalnız seyrek tazelenir.
 */
export function useTuvalDongusu(ciz: (k: Kare) => void, enFazlaDpr = 2) {
  const tuval = useRef<HTMLCanvasElement>(null);
  const cizRef = useRef(ciz);
  cizRef.current = ciz;

  useEffect(() => {
    const c = tuval.current;
    const x = c?.getContext('2d');
    if (!c || !x) return;
    const azalt = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W = 0;
    let H = 0;
    const boyutla = () => {
      const D = Math.min(devicePixelRatio || 1, enFazlaDpr);
      const k = c.getBoundingClientRect();
      W = k.width;
      H = k.height;
      c.width = Math.max(1, Math.round(W * D));
      c.height = Math.max(1, Math.round(H * D));
      x.setTransform(D, 0, 0, D, 0, 0);
    };
    boyutla();

    const fare: Fare = { var: false, x: 0, y: 0, vx: 0, vy: 0, hiz: 0 };
    let hamX = 0;
    let hamY = 0;
    let hamVar = false;
    const fareyeGore = (e: PointerEvent) => {
      // Ekran geçişinde üst kap ölçeklenir; yeri her harekette tazele
      const k = c.getBoundingClientRect();
      hamX = e.clientX - k.left;
      hamY = e.clientY - k.top;
      hamVar = true;
    };
    const fareCikti = () => {
      hamVar = false;
    };
    const fareyiIlerlet = () => {
      if (hamVar && fare.var) {
        fare.vx = hamX - fare.x;
        fare.vy = hamY - fare.y;
      } else {
        fare.vx = 0;
        fare.vy = 0;
      }
      fare.hiz = Math.min(Math.hypot(fare.vx, fare.vy), 30);
      fare.var = hamVar;
      fare.x = hamX;
      fare.y = hamY;
    };

    const baslangic = performance.now();
    let son = baslangic;
    let istek = 0;
    let zamanlayici = 0;

    const kare = (simdi: number) => {
      const dt = Math.min(Math.max((simdi - son) / 16.667, 0), 3); // uzun takılmada sıçramasın
      son = simdi;
      fareyiIlerlet();
      cizRef.current({ x, W, H, dt, sn: (simdi - baslangic) / 1000, fare, azalt: false });
      istek = requestAnimationFrame(kare);
    };
    const durgun = () => {
      cizRef.current({ x, W, H, dt: 0, sn: (performance.now() - baslangic) / 1000, fare, azalt: true });
    };
    const durdur = () => {
      cancelAnimationFrame(istek);
      clearInterval(zamanlayici);
    };
    const baslat = () => {
      durdur();
      son = performance.now();
      if (azalt) {
        durgun();
        zamanlayici = window.setInterval(durgun, AZALT_ARALIGI);
      } else {
        istek = requestAnimationFrame(kare);
      }
    };
    const gorunurluk = () => (document.hidden ? durdur() : baslat());
    const gozlemci = new ResizeObserver(() => {
      boyutla();
      if (azalt) durgun();
    });
    gozlemci.observe(c);

    if (!azalt) {
      addEventListener('pointermove', fareyeGore);
      document.addEventListener('pointerleave', fareCikti);
    }
    document.addEventListener('visibilitychange', gorunurluk);
    baslat();
    return () => {
      durdur();
      gozlemci.disconnect();
      removeEventListener('pointermove', fareyeGore);
      document.removeEventListener('pointerleave', fareCikti);
      document.removeEventListener('visibilitychange', gorunurluk);
    };
  }, [enFazlaDpr]);

  return tuval;
}

/** Yaylı ve sürtünmeli itilen nokta: fare iter, yay yerine çeker (uzay boşluğu hissi). */
export interface Itilen {
  ox: number;
  oy: number;
  vx: number;
  vy: number;
}

export function itilen(): Itilen {
  return { ox: 0, oy: 0, vx: 0, vy: 0 };
}

export interface ItmeAyari {
  itmeYaricapi: number;
  itmeGucu: number;
  hizEtkisi: number;
  surukleme: number;
  donusYayi: number;
  surtunme: number;
}

/** (bx, by) yerindeki noktayı fareye göre iter ve yerine doğru yaylar. */
export function it(p: Itilen, bx: number, by: number, f: Fare, a: ItmeAyari, dt: number): void {
  if (dt <= 0) return;
  if (f.var) {
    const dx = bx + p.ox - f.x;
    const dy = by + p.oy - f.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < a.itmeYaricapi * a.itmeYaricapi) {
      const d = Math.sqrt(d2) || 1;
      const k = 1 - d / a.itmeYaricapi;
      const g = k * k * (a.itmeGucu + f.hiz * a.hizEtkisi) * dt;
      p.vx += (dx / d) * g + f.vx * k * a.surukleme;
      p.vy += (dy / d) * g + f.vy * k * a.surukleme;
    }
  }
  const surt = a.surtunme ** dt;
  p.vx = (p.vx - p.ox * a.donusYayi * dt) * surt;
  p.vy = (p.vy - p.oy * a.donusYayi * dt) * surt;
  p.ox += p.vx * dt;
  p.oy += p.vy * dt;
}
