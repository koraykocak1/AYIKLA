import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { dosyaAdresi, onizlemeAdresi, sonParca, tarihMetni } from '../mantik/bicim';
import type { ArayuzMedya } from '../../ortak/mesajlar';

interface Props {
  liste: ArayuzMedya[];
  sira: number;
  setSira: (n: number | null) => void;
  grupAdi: (m: ArayuzMedya) => string;
}

/** Tıklanan dosyayı büyük gösterir; videolar oynar; ← → ile gezilir, Esc kapatır. */
export function BuyukGorunum({ liste, sira, setSira, grupAdi }: Props) {
  const m = liste[sira];
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
  return (
    <motion.div className="buyuk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSira(null)}>
      <div className="buyuk-ic" onClick={(e) => e.stopPropagation()}>
        <AnimatePresence mode="wait">
          <motion.div
            key={m.anahtar}
            className="buyuk-medya"
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
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
          <span className="soluk">
            {tarihMetni(m.tarih)}
            {m.tahmini ? ' (tahmini)' : ''} · {grupAdi(m)}
          </span>
          <span className="soluk">
            {sira + 1} / {liste.length}
          </span>
        </footer>
      </div>
      <button
        className="ok sol"
        aria-label="Önceki"
        onClick={(e) => {
          e.stopPropagation();
          git(sira - 1);
        }}
      >
        ‹
      </button>
      <button
        className="ok sag"
        aria-label="Sonraki"
        onClick={(e) => {
          e.stopPropagation();
          git(sira + 1);
        }}
      >
        ›
      </button>
      <button className="kapat" aria-label="Kapat" onClick={() => setSira(null)}>
        ✕
      </button>
    </motion.div>
  );
}
