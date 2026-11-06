import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { api } from '../api';
import { egri, sure } from '../hareket';
import { hataMetni, sayi, tarihMetni } from '../mantik/bicim';
import type { YedekDurumu } from '../../ortak/mesajlar';

const IS_ADI = { yedek: 'yedek alınıyor', denetim: 'arşiv denetleniyor' } as const;

/** Yedek ve sağlık: model onay kutusu görünümünde (taslak 4. parça). */
export function YedekKutusu({ onKapat, onGeriYuklendi }: { onKapat: () => void; onGeriYuklendi: () => void }) {
  const [durum, setDurum] = useState<YedekDurumu | null>(null);
  const [is, setIs] = useState<{ ad: keyof typeof IS_ADI; bitti: number; toplam: number } | null>(null);
  const [calisiyor, setCalisiyor] = useState(false);
  const [not, setNot] = useState<string | null>(null);

  useEffect(() => {
    api.yedekDurumu().then(setDurum, (h) => setNot(hataMetni(h)));
    return api.olaylariDinle((o) => o.tur === 'arsivIs' && setIs({ ad: o.ad, bitti: o.bitti, toplam: o.toplam }));
  }, []);

  async function calistir(f: () => Promise<unknown>) {
    setCalisiyor(true);
    setNot(null);
    try {
      await f();
    } catch (h) {
      setNot(hataMetni(h));
    } finally {
      setCalisiyor(false);
      setIs(null);
    }
  }

  const y = durum?.yedek;
  const s = durum?.saglik;
  return (
    <motion.div className="s-perde" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(e) => e.target === e.currentTarget && !calisiyor && onKapat()}>
      <motion.section
        className="model-onay yedek-kutu"
        role="dialog"
        aria-label="Yedek"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: sure.yavas, ease: egri.yumusak }}
      >
        <p className="mo-baslik">
          {y ? `Son yedek: ${tarihMetni(y.zaman)} · ${y.yol} · ${y.dogrulandi ? 'doğrulandı' : 'doğrulanamadı'}` : 'Henüz yedek yok'}
        </p>
        <p className="soluk">
          Yalnız yeni dosyalar kopyalanır; her dosya kopyadan sonra kontrol edilir.{' '}
          {s ? `Son sağlık denetimi: ${sayi(s.saglam)} dosya sağlam${s.sorun ? ` · ${sayi(s.sorun)} sorun` : ''}.` : 'Arşiv henüz denetlenmedi.'}
        </p>
        {is && (
          <p className="etiket s-alim" role="status">
            {IS_ADI[is.ad]} {sayi(is.bitti)} / {sayi(is.toplam)}
          </p>
        )}
        {not && <p className="not">{not}</p>}
        <div className="mo-dugmeler">
          <button className="ikincil" disabled={calisiyor} onClick={onKapat}>
            Kapat
          </button>
          <button
            className="ikincil"
            disabled={calisiyor}
            onClick={() =>
              void calistir(async () => {
                const r = await api.geriYukleSec();
                if (!r) return;
                setNot(`“${r.ad}” arşivi ${r.kok} klasörüne geri yüklendi.`);
                onGeriYuklendi();
              })
            }
          >
            Geri yükle
          </button>
          <button className="ikincil" disabled={calisiyor} onClick={() => void calistir(async () => setDurum(await api.arsivDenetle()))}>
            Arşivi denetle
          </button>
          <button
            className="altin"
            disabled={calisiyor}
            onClick={() =>
              void calistir(async () => {
                const r = await api.yedekSec();
                if (r) setDurum(r);
              })
            }
          >
            Yedek al
          </button>
        </div>
      </motion.section>
    </motion.div>
  );
}
