import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { kartSahnesi as ayar } from '../hareket';
import { elemeAdi, onizlemeAdresi, tarihSaat } from '../mantik/bicim';
import { KART, gorunenAralik, izgaraYerlesimi, kureYerlesimi, type IzgaraYerlesimi } from '../mantik/kartDuzeni';
import type { YilBolumu } from '../mantik/gruplama';
import type { ArayuzMedya } from '../../ortak/mesajlar';

export type Gorunum = 'izgara' | 'kure';

interface Props {
  bolumler: YilBolumu[];
  liste: ArayuzMedya[]; // ızgara sırası (duzlestir)
  gorunum: Gorunum;
  /** Taşınan kartlar: ekrandaki bu noktaya (soldaki grup) uçup kaybolur. */
  ucanlar: Map<string, { x: number; y: number }>;
  onAc: (sira: number, kutu: DOMRect) => void;
  onSagTik: (e: ReactMouseEvent, m: ArayuzMedya) => void;
}

/** Bir kartın canlı durumu: yeri, büyüklüğü, saydamlığı ve bunların hızları (yay motoru). */
interface Yay {
  el: HTMLDivElement;
  x: number;
  y: number;
  s: number;
  o: number;
  vx: number;
  vy: number;
  vs: number;
  vo: number;
  sertlik: number; // her kart biraz farklı: hepsi aynı anda varmasın
  baslama: number; // bu andan önce kıpırdamaz (sn, sıralı uçuş)
  yerlesti: boolean; // yerine oturdu: artık doğrudan hedefi izler (kaydırmada gecikmesin)
}

interface Hedef {
  x: number;
  y: number;
  s: number;
  o: number;
  z: number;
}

const UST = 6; // sahnenin üst boşluğu (px)

/**
 * Sonuç kartları (CSS 3B sahne, tek döngülü yay motoru).
 * IZGARA: yıl › ay başlıkları, büyük kartlar, altında tarih + saat; ataletli kaydırma; yalnız ekrandakiler çizilir.
 * KÜRE (gösteri): kartlar kendi yaylarıyla küre yüzeyine uçar; küre yavaş döner, sürükleyince ataletle çevrilir,
 * fare yukarı-aşağı eğer, arkadakiler soluk. Kürede en çok `ayar.kureEnFazla` kart durur.
 */
export function KartSahnesi({ bolumler, liste, gorunum, ucanlar, onAc, onSagTik }: Props) {
  const kap = useRef<HTMLDivElement>(null);
  const basliklar = useRef<HTMLDivElement>(null);
  const cubuk = useRef<HTMLDivElement>(null);
  const [olcu, setOlcu] = useState({ W: 0, H: 0 });
  const yer = useMemo<IzgaraYerlesimi>(() => izgaraYerlesimi(bolumler, Math.max(KART.en, olcu.W)), [bolumler, olcu.W]);
  const kartYeri = useMemo(() => new Map(yer.kartlar.map((k) => [k.anahtar, k])), [yer]);
  const [aralik, setAralik] = useState<[number, number]>([0, 40]);
  const [gecis, setGecis] = useState(false); // ızgara ⇄ küre uçuşu sürüyor

  // Döngünün okuduğu canlı değerler (her karede React'e dokunmamak için ref'te)
  const ic = useRef({
    W: 0,
    H: 0,
    yer,
    kartYeri,
    gorunum,
    ucanlar,
    kaydir: 0,
    hedefKaydir: 0,
    donus: 0,
    donusHizi: 0,
    egim: 0.2,
    egimHedef: 0.2,
    surukle: null as null | { x: number; y: number; oynadi: boolean },
    kartlar: new Map<string, Yay>(),
    giris: performance.now() / 1000, // sahne yeni açıldı: kartlar sırayla uçarak gelir
    aralik: [0, 40] as [number, number],
  }).current;
  ic.yer = yer;
  ic.kartYeri = kartYeri;
  ic.ucanlar = ucanlar;

  // Görünüm değişince her kart sırasıyla yeniden uçar
  useEffect(() => {
    if (ic.gorunum === gorunum) return;
    ic.gorunum = gorunum;
    const simdi = performance.now() / 1000;
    for (const [anahtar, y] of ic.kartlar) {
      const sira = ic.kartYeri.get(anahtar)?.sira ?? 0;
      y.yerlesti = false;
      y.baslama = simdi + Math.min(Math.abs(sira - ic.aralik[0]), 80) * ayar.siraAraligi;
    }
    setGecis(true);
    const t = window.setTimeout(() => setGecis(false), 1600);
    return () => clearTimeout(t);
  }, [gorunum]);

  useEffect(() => {
    const el = kap.current;
    if (!el) return;
    const g = new ResizeObserver(() => {
      ic.W = el.clientWidth;
      ic.H = el.clientHeight;
      setOlcu({ W: el.clientWidth, H: el.clientHeight });
    });
    g.observe(el);
    return () => g.disconnect();
  }, []);

  // Tek döngü: kaydırma, küre dönüşü ve tüm kartların yayları
  useEffect(() => {
    const azalt = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let son = performance.now();
    let istek = 0;

    const hedefBul = (anahtar: string): Hedef => {
      const k = ic.kartYeri.get(anahtar);
      const ucan = ic.ucanlar.get(anahtar);
      const kutu = kap.current?.getBoundingClientRect();
      if (ucan && kutu) {
        return { x: ucan.x - kutu.left - ic.yer.kartEn / 2, y: ucan.y - kutu.top - ic.yer.kartBoy / 2, s: 0.12, o: 0, z: 1 };
      }
      if (!k) return { x: 0, y: 0, s: 0.5, o: 0, z: 0 };
      if (ic.gorunum === 'kure') {
        const n = Math.min(ic.yer.kartlar.length, ayar.kureEnFazla);
        if (k.sira >= n) return { x: ic.W / 2 - ic.yer.kartEn / 2, y: ic.H / 2, s: 0.2, o: 0, z: -1 };
        const R = Math.min(ic.W, ic.H) * ayar.kureYaricapi;
        const p = kureYerlesimi(k.sira, n, ic.donus, ic.egim, R);
        return {
          x: ic.W / 2 + p.x - ic.yer.kartEn / 2,
          y: ic.H / 2 + p.y - ic.yer.kartBoy / 2,
          s: p.olcek * ayar.kureKartOlcegi,
          o: 0.18 + 0.82 * ((p.z + 1) / 2),
          z: p.z,
        };
      }
      return { x: k.x, y: UST + k.y - ic.kaydir, s: 1, o: 1, z: 0 };
    };

    const kare = (simdiMs: number) => {
      const dt = Math.min((simdiMs - son) / 1000, 0.05);
      son = simdiMs;
      const simdi = simdiMs / 1000;

      // Kaydırma: hedefe yumuşakça yaklaşır (ataletli his)
      const enAlt = Math.max(0, ic.yer.yukseklik + UST + 40 - ic.H);
      ic.hedefKaydir = Math.min(Math.max(ic.hedefKaydir, 0), enAlt);
      ic.kaydir += (ic.hedefKaydir - ic.kaydir) * (azalt ? 1 : 1 - Math.pow(1 - ayar.kaydirmaYumusakligi, dt * 60));
      if (Math.abs(ic.hedefKaydir - ic.kaydir) < 0.3) ic.kaydir = ic.hedefKaydir;

      // Küre: kendiliğinden yavaş döner; sürüklenince verilen hız ataletle söner
      if (!ic.surukle) {
        ic.donus += (azalt ? 0 : ayar.kureDonusu) * dt + ic.donusHizi;
        ic.donusHizi *= Math.pow(ayar.kureSurtunme, dt * 60);
      }
      ic.egim += (ic.egimHedef - ic.egim) * Math.min(1, dt * 4);

      if (basliklar.current) {
        basliklar.current.style.transform = `translate3d(0, ${UST - ic.kaydir}px, 0)`;
      }
      if (cubuk.current) {
        const oran = ic.H / Math.max(ic.H, ic.yer.yukseklik + UST + 40);
        cubuk.current.style.transform = `translate3d(0, ${(ic.kaydir / Math.max(1, enAlt)) * ic.H * (1 - oran)}px, 0) scaleY(${oran})`;
        cubuk.current.style.opacity = ic.gorunum === 'izgara' && oran < 1 ? '1' : '0';
      }

      for (const [anahtar, y] of ic.kartlar) {
        const h = hedefBul(anahtar);
        if (azalt || y.yerlesti) {
          y.x = h.x;
          y.y = h.y;
          y.s = h.s;
          y.o = h.o;
        } else if (simdi >= y.baslama) {
          const k = y.sertlik;
          const c = 2 * Math.sqrt(k) * ayar.sonum;
          y.vx += (-k * (y.x - h.x) - c * y.vx) * dt;
          y.vy += (-k * (y.y - h.y) - c * y.vy) * dt;
          y.vs += (-k * (y.s - h.s) - c * y.vs) * dt;
          y.vo += (-k * (y.o - h.o) - c * y.vo) * dt;
          y.x += y.vx * dt;
          y.y += y.vy * dt;
          y.s += y.vs * dt;
          y.o += y.vo * dt;
          const yakin = Math.abs(y.x - h.x) + Math.abs(y.y - h.y) < 0.6 && Math.abs(y.vx) + Math.abs(y.vy) < 2;
          // Kürede hedef sürekli döndüğü için yay hep çalışır; ızgarada oturunca doğrudan izler
          if (yakin && ic.gorunum === 'izgara' && !ic.ucanlar.has(anahtar)) y.yerlesti = true;
        }
        y.el.style.transform = `translate3d(${y.x}px, ${y.y}px, 0) scale(${y.s})`;
        y.el.style.opacity = String(Math.max(0, Math.min(1, y.o)));
        y.el.style.zIndex = ic.gorunum === 'kure' ? String(Math.round((h.z + 1) * 500)) : '1';
      }

      // Ekranda görünen aralık değişince React'e yalnız o zaman haber ver
      const [bas, sonu] = gorunenAralik(ic.yer.kartlar, ic.kaydir - ic.H * 0.4, ic.kaydir + ic.H * 1.4, ic.yer.kartBoy);
      if (bas !== ic.aralik[0] || sonu !== ic.aralik[1]) {
        ic.aralik = [bas, sonu];
        setAralik([bas, sonu]);
      }
      istek = requestAnimationFrame(kare);
    };
    const baslat = () => {
      cancelAnimationFrame(istek);
      son = performance.now();
      istek = requestAnimationFrame(kare);
    };
    const gorunurluk = () => (document.hidden ? cancelAnimationFrame(istek) : baslat());
    document.addEventListener('visibilitychange', gorunurluk);
    baslat();
    return () => {
      cancelAnimationFrame(istek);
      document.removeEventListener('visibilitychange', gorunurluk);
    };
  }, []);

  /** Kart DOM'a girince yay motoruna kaydolur; çıkınca düşer. */
  const kaydet = (anahtar: string, el: HTMLDivElement | null) => {
    if (!el) {
      ic.kartlar.delete(anahtar);
      return;
    }
    if (ic.kartlar.has(anahtar)) {
      ic.kartlar.get(anahtar)!.el = el;
      return;
    }
    const k = ic.kartYeri.get(anahtar);
    const simdi = performance.now() / 1000;
    const girerken = simdi - ic.giris < 0.9;
    const x = k?.x ?? 0;
    const y = UST + (k?.y ?? 0) - ic.kaydir;
    const yay: Yay = {
      el,
      x,
      y: girerken ? y + 46 : y,
      s: girerken ? 0.92 : 1,
      o: girerken ? 0 : 1,
      vx: 0,
      vy: 0,
      vs: 0,
      vo: 0,
      sertlik: ayar.sertlik * (0.85 + Math.random() * 0.3),
      baslama: girerken ? ic.giris + Math.min(k?.sira ?? 0, 40) * ayar.siraAraligi : simdi,
      // Kaydırırken gelen kart doğrudan yerinde belirir
      yerlesti: !girerken && ic.gorunum === 'izgara',
    };
    el.style.transform = `translate3d(${yay.x}px, ${yay.y}px, 0) scale(${yay.s})`;
    el.style.opacity = String(yay.o);
    ic.kartlar.set(anahtar, yay);
  };

  // Çizilecek kartlar: ızgarada görünenler; kürede (ve geçişte) ilk kureEnFazla kart da
  const cizilen = useMemo(() => {
    const sec = new Set<number>();
    for (let i = aralik[0]; i < Math.min(aralik[1], liste.length); i++) sec.add(i);
    if (gorunum === 'kure' || gecis) for (let i = 0; i < Math.min(liste.length, ayar.kureEnFazla); i++) sec.add(i);
    for (const a of ucanlar.keys()) {
      const k = kartYeri.get(a);
      if (k) sec.add(k.sira);
    }
    return [...sec].sort((a, b) => a - b);
  }, [aralik, gorunum, gecis, liste.length, ucanlar, kartYeri]);

  return (
    <div
      ref={kap}
      className={`kart-sahnesi ${gorunum}`}
      onWheel={(e) => {
        if (ic.gorunum === 'izgara') ic.hedefKaydir += e.deltaY;
      }}
      onPointerDown={(e) => {
        if (ic.gorunum !== 'kure' || e.button !== 0) return;
        ic.surukle = { x: e.clientX, y: e.clientY, oynadi: false };
        ic.donusHizi = 0;
      }}
      onPointerMove={(e) => {
        const kutu = kap.current?.getBoundingClientRect();
        if (ic.gorunum !== 'kure' || !kutu) return;
        const s = ic.surukle;
        if (s) {
          const dx = e.clientX - s.x;
          if (Math.abs(dx) + Math.abs(e.clientY - s.y) > 4) s.oynadi = true;
          ic.donus += dx * ayar.surukleme;
          ic.donusHizi = dx * ayar.surukleme;
          s.x = e.clientX;
          s.y = e.clientY;
        }
        // Fare yukarı-aşağı küreyi eğer
        ic.egimHedef = ((e.clientY - kutu.top) / kutu.height - 0.5) * ayar.egim;
      }}
      onPointerUp={() => {
        // Bırakınca gelen tıklama, sürüklemeyse kartı açmasın; sonra serbest bırak
        window.setTimeout(() => (ic.surukle = null), 0);
      }}
      onPointerLeave={() => (ic.surukle = null)}
    >
      <div ref={basliklar} className="ks-basliklar" aria-hidden={gorunum === 'kure'}>
        {yer.basliklar.map((b) => (
          <div key={`${b.tur}-${b.y}`} className={`ks-${b.tur}`} style={{ top: b.y }}>
            {b.metin}
            <span>{b.adet}</span>
          </div>
        ))}
      </div>

      {cizilen.map((i) => {
        const m = liste[i];
        if (!m) return null;
        const { tarih, saat } = tarihSaat(m.tarih);
        return (
          <div key={m.anahtar} ref={(el) => kaydet(m.anahtar, el)} className="ks-kart" style={{ width: yer.kartEn }}>
            <button
              className="ks-resim"
              style={{ height: yer.kartBoy, background: m.renk }}
              title={m.yol}
              onClick={(e) => {
                if (ic.surukle?.oynadi) return;
                onAc(i, e.currentTarget.getBoundingClientRect());
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                onSagTik(e, m);
              }}
            >
              <img
                src={onizlemeAdresi(m.onizlemeler[0] ?? '')}
                alt=""
                draggable={false}
                onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
              />
              {m.tur === 'video' && <span className="rozet video">▶ Video</span>}
              {m.ham?.length ? <span className="rozet ham">RAW</span> : null}
              {m.eleme && <span className="rozet eleme">{elemeAdi(m.eleme)}</span>}
              {m.tahmini && (
                <span className="rozet tahmini" title="Çekim tarihi bulunamadı, dosya tarihi kullanıldı">
                  ~
                </span>
              )}
            </button>
            <p className="ks-etiket">
              {tarih} · <span>{saat}</span>
            </p>
          </div>
        );
      })}

      <div className="ks-cubuk" aria-hidden="true">
        <div ref={cubuk} />
      </div>
    </div>
  );
}
