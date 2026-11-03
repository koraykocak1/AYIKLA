import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { dosyaAdresi, onizlemeAdresi, sonParca, tarihSaat } from '../mantik/bicim';
import { egri, sure, yay } from '../hareket';
import type { ArayuzMedya } from '../../ortak/mesajlar';

interface Props {
  liste: ArayuzMedya[];
  sira: number;
  setSira: (n: number | null) => void;
  grupAdi: (m: ArayuzMedya) => string;
  /** Tıklanan küçük resmin ekrandaki yeri: fotoğraf oradan büyüyerek açılır. */
  acilis: DOMRect | null;
}

/** Büyük görünümde fotoğrafın kaplayacağı alan (CSS'teki .buyuk-ic ile aynı ölçüler). */
function hedefKutu(m: ArayuzMedya): DOMRect {
  const kw = window.innerWidth * 0.86;
  const kh = window.innerHeight * 0.86 - 42; // alt bilgi şeridi
  const oran = m.genislik && m.yukseklik ? m.genislik / m.yukseklik : 4 / 3;
  const w = Math.min(kw, kh * oran);
  const h = w / oran;
  return new DOMRect((window.innerWidth - w) / 2, window.innerHeight * 0.07 + (kh - h) / 2, w, h);
}

const kayma = {
  gir: (yon: number) => ({ opacity: 0, x: yon * 70, scale: 0.98 }),
  cik: (yon: number) => ({ opacity: 0, x: -yon * 70, scale: 0.98, transition: { duration: sure.hizli, ease: egri.cikis } }),
};

/** Tıklanan dosyayı büyük gösterir; videolar oynar; ← → ile gezilir, Esc kapatır. */
export function BuyukGorunum({ liste, sira, setSira, grupAdi, acilis }: Props) {
  const m = liste[sira];
  const azalt = useReducedMotion();
  const onceki = useRef(sira);
  const yon = sira >= onceki.current ? 1 : -1;
  useEffect(() => {
    onceki.current = sira;
  }, [sira]);
  // Açılış: küçük resmin kopyası onun yerinden hedef boyuta uçar, sonra asıl görüntüye bırakır
  const [ucus, setUcus] = useState(() => (acilis && m && !azalt ? { kaynak: acilis, hedef: hedefKutu(m), anahtar: m.anahtar } : null));
  const git = (n: number) => setSira(Math.max(0, Math.min(liste.length - 1, n)));

  useEffect(() => {
    const tus = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSira(null);
      if (e.key === 'ArrowRight') git(sira + 1);
      if (e.key === 'ArrowLeft') git(sira - 1);
    };
    window.addEventListener('keydown', tus);
    return () => window.removeEventListener('keydown', tus);
  }, [sira, liste.length]);

  if (!m) return null;
  const ucusta = ucus?.anahtar === m.anahtar;
  return (
    <motion.div
      className="buyuk"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: sure.normal } }}
      exit={{ opacity: 0, transition: { duration: sure.hizli } }}
      onClick={() => setSira(null)}
    >
      <div className="buyuk-ic" onClick={(e) => e.stopPropagation()}>
        <AnimatePresence mode="popLayout" custom={yon} initial={false}>
          <motion.div
            key={m.anahtar}
            className="buyuk-medya"
            custom={yon}
            variants={kayma}
            initial="gir"
            animate={{ x: 0, scale: 1, opacity: ucusta ? 0 : 1, transition: { ...yay.canli, opacity: { duration: sure.normal } } }}
            exit="cik"
          >
            {m.tur === 'video' ? (
              <video src={dosyaAdresi(m.yol)} controls autoPlay poster={onizlemeAdresi(m.onizlemeler[1] ?? m.onizlemeler[0])} />
            ) : (
              <img src={dosyaAdresi(m.yol)} alt="" style={{ backgroundImage: `url("${onizlemeAdresi(m.onizlemeler[0])}")` }} />
            )}
          </motion.div>
        </AnimatePresence>
        <footer>
          <span>
            {sonParca(m.yol)}
            {m.ham?.length ? <span className="soluk"> + RAW eşi</span> : null}
          </span>
          <span className="b-tarih etiket">
            {tarihSaat(m.tarih).tarih} · <span className="b-saat">{tarihSaat(m.tarih).saat}</span>
            {m.tahmini ? ' (tahmini)' : ''} <span className="soluk">· {grupAdi(m)}</span>
          </span>
          <span className="soluk etiket">
            {sira + 1} / {liste.length}
          </span>
        </footer>
      </div>

      {ucus && (
        <motion.img
          className="ucan-resim"
          src={onizlemeAdresi(m.onizlemeler[0])}
          alt=""
          style={{ left: ucus.hedef.x, top: ucus.hedef.y, width: ucus.hedef.width, height: ucus.hedef.height }}
          initial={{
            x: ucus.kaynak.x + ucus.kaynak.width / 2 - (ucus.hedef.x + ucus.hedef.width / 2),
            y: ucus.kaynak.y + ucus.kaynak.height / 2 - (ucus.hedef.y + ucus.hedef.height / 2),
            scale: ucus.kaynak.width / ucus.hedef.width,
            borderRadius: 24,
          }}
          animate={{ x: 0, y: 0, scale: 1, borderRadius: 6 }}
          transition={{ duration: sure.yavas, ease: egri.yumusak }}
          onAnimationComplete={() => setUcus(null)}
        />
      )}

      <motion.button
        className="ok sol"
        style={{ y: "-50%" }}
        aria-label="Önceki"
        whileHover={{ x: -3 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => {
          e.stopPropagation();
          git(sira - 1);
        }}
      >
        ‹
      </motion.button>
      <motion.button
        className="ok sag"
        style={{ y: "-50%" }}
        aria-label="Sonraki"
        whileHover={{ x: 3 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => {
          e.stopPropagation();
          git(sira + 1);
        }}
      >
        ›
      </motion.button>
      <button className="kapat" aria-label="Kapat" onClick={() => setSira(null)}>
        ✕
      </button>
    </motion.div>
  );
}
