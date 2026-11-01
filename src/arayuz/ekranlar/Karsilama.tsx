import { useEffect, useState, type DragEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { api } from '../api';
import { bulunduMetni, hataMetni, sayi, sonParca, tarihMetni } from '../mantik/bicim';
import type { Sayim } from '../../ortak/mesajlar';
import type { SonArsiv } from '../../motor/tipler';

interface Props {
  not?: string;
  onceki?: string[];
  onBaslat: (girdiler: string[], sayim: Sayim) => void;
}

export function Karsilama({ not, onceki, onBaslat }: Props) {
  const [girdiler, setGirdiler] = useState<string[] | null>(null);
  const [sayim, setSayim] = useState<Sayim | null>(null);
  const [sayiliyor, setSayiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [ustunde, setUstunde] = useState(false);
  const [arsivler, setArsivler] = useState<SonArsiv[]>([]);

  async function sec(g: string[]) {
    if (!g.length) return;
    setGirdiler(g);
    setSayim(null);
    setHata(null);
    setSayiliyor(true);
    try {
      setSayim(await api.say(g));
    } catch (h) {
      setHata(hataMetni(h));
    } finally {
      setSayiliyor(false);
    }
  }

  useEffect(() => {
    api.sonArsivler().then(setArsivler).catch(() => {});
    if (onceki?.length) void sec(onceki);
    else
      api
        .baslangicKlasoru()
        .then((k) => {
          if (k) void sec([k]);
        })
        .catch(() => {});
  }, []);

  function birak(e: DragEvent) {
    e.preventDefault();
    setUstunde(false);
    const yollar = Array.from(e.dataTransfer.files).map((f) => api.yolAl(f)).filter(Boolean);
    void sec(yollar);
  }

  return (
    <div className="karsilama">
      <header className="marka">
        <h1>AYIKLA</h1>
        <p>Fotoğraflarını sahneye ve tarihe göre ayıkla</p>
      </header>

      <div
        className={`birakma${ustunde ? ' ustunde' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setUstunde(true);
        }}
        onDragLeave={() => setUstunde(false)}
        onDrop={birak}
      >
        <div className="birakma-ic">
          <div className="deste" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p className="birakma-baslik">Fotoğrafları veya klasörü buraya bırak</p>
          <button
            className="ikincil"
            onClick={async () => {
              const k = await api.klasorSec();
              if (k) void sec([k]);
            }}
          >
            Klasör seç
          </button>
          <AnimatePresence>
            {girdiler && (
              <motion.div className="secim" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <p className="secilen">{girdiler.map(sonParca).join(', ')}</p>
                {sayiliyor && <p className="soluk">Dosyalar sayılıyor…</p>}
                {sayim && <p className="bulundu">{bulunduMetni(sayim)}</p>}
                {sayim && sayim.foto + sayim.video > 0 && (
                  <motion.button
                    className="altin"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onBaslat(girdiler, sayim)}
                  >
                    Ayıkla
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          {not && <p className="not">{not}</p>}
          {hata && <p className="hata">{hata}</p>}
        </div>
      </div>

      {arsivler.length > 0 ? (
        <section className="son-arsivler">
          <h2>Son arşivler</h2>
          <ul>
            {arsivler.map((a) => (
              <li key={a.girdiler.join('|')}>
                <button onClick={() => void sec(a.girdiler)}>
                  <span className="ad">{a.girdiler.map(sonParca).join(', ')}</span>
                  <span className="soluk">
                    {sayi(a.foto + a.video)} dosya · {tarihMetni(a.tarih)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <div />
      )}
    </div>
  );
}
