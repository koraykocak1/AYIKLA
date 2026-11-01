import { useEffect, useState, type DragEvent, type ReactNode } from 'react';
import { AkanSayi } from '../bilesenler/AkanSayi';
import { egri, siraliGecikme, sure, yay } from '../hareket';
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
        <h1 aria-label="AYIKLA">
          {'AYIKLA'.split('').map((h, i) => (
            <motion.span
              key={i}
              aria-hidden="true"
              style={{ display: 'inline-block' }}
              initial={{ opacity: 0, y: 28, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: sure.sinematik, ease: egri.yumusak, delay: 0.1 + i * 0.07 }}
            >
              {h}
            </motion.span>
          ))}
        </h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: sure.yavas, delay: 0.65 }}>
          Fotoğraflarını sahneye ve tarihe göre ayıkla
        </motion.p>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: ustunde ? 1.02 : 1 }}
        transition={ustunde ? yay.canli : { duration: sure.sinematik, ease: egri.yumusak, delay: 0.45 }}
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
                {sayim && (
                  <p className="bulundu" aria-label={bulunduMetni(sayim)}>
                    <BulunduSayaci sayim={sayim} />
                  </p>
                )}
                {sayim && sayim.foto + sayim.video > 0 && (
                  <motion.button
                    className="altin parlak"
                    initial={{ opacity: 0, scale: 0.6, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ ...yay.zipla, delay: 0.35 }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
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
      </motion.div>

      {arsivler.length > 0 ? (
        <section className="son-arsivler">
          <h2>Son arşivler</h2>
          <ul>
            {arsivler.map((a, i) => (
              <motion.li
                key={a.girdiler.join('|')}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: sure.yavas, ease: egri.yumusak, delay: 0.8 + siraliGecikme(i, 0.06) }}
              >
                <button onClick={() => void sec(a.girdiler)}>
                  <span className="ad">{a.girdiler.map(sonParca).join(', ')}</span>
                  <span className="soluk">
                    {sayi(a.foto + a.video)} dosya · {tarihMetni(a.tarih)}
                  </span>
                </button>
              </motion.li>
            ))}
          </ul>
        </section>
      ) : (
        <div />
      )}
    </div>
  );
}

/** "1.240 fotoğraf · 86 video bulundu" — sayılar akarak artar. */
function BulunduSayaci({ sayim }: { sayim: Sayim }) {
  if (sayim.foto + sayim.video === 0) return <>{bulunduMetni(sayim)}</>;
  const parcalar: ReactNode[] = [];
  if (sayim.foto) parcalar.push(<span key="f"><AkanSayi deger={sayim.foto} /> fotoğraf</span>);
  if (sayim.video) parcalar.push(<span key="v"><AkanSayi deger={sayim.video} /> video</span>);
  return (
    <>
      {parcalar.map((p, i) => (
        <span key={i}>
          {i > 0 && ' · '}
          {p}
        </span>
      ))}{' '}
      bulundu
      {sayim.ham > 0 && (
        <span className="ham-not">
          {' · '}
          <AkanSayi deger={sayim.ham} /> RAW eşi bağlandı
        </span>
      )}
    </>
  );
}
