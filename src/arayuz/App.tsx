import { useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { egri, sure } from './hareket';
import { api } from './api';
import { Karsilama } from './ekranlar/Karsilama';
import { Ayiklama } from './ekranlar/Ayiklama';
import { Sonuc } from './ekranlar/Sonuc';
import type { ArayuzMedya, Sayim } from '../ortak/mesajlar';
import type { Grup } from '../motor/tipler';

type Ekran =
  | { ad: 'karsilama'; not?: string; girdiler?: string[] }
  | { ad: 'ayiklama'; girdiler: string[]; sayim: Sayim }
  | { ad: 'sonuc' };

export function App() {
  const [ekran, setEkran] = useState<Ekran>({ ad: 'karsilama' });
  const [gruplar, setGruplar] = useState<Grup[]>([]);
  const [medya, setMedya] = useState<ArayuzMedya[]>([]);

  useEffect(() => {
    api.gruplar().then(setGruplar).catch(() => {});
  }, []);

  return (
    // reducedMotion="user": sistemde "hareketi azalt" açıksa Motion dönüşümleri kapatır, yalnız solma kalır
    <MotionConfig reducedMotion="user">
    <AnimatePresence mode="wait">
      <motion.main
        key={ekran.ad}
        className="ekran"
        data-ekran={ekran.ad}
        initial={{ opacity: 0, scale: 1.035, filter: 'blur(14px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', transition: { duration: sure.sinematik, ease: egri.yumusak } }}
        exit={{ opacity: 0, scale: 0.97, transition: { duration: sure.normal, ease: egri.cikis } }}
      >
        {ekran.ad === 'karsilama' && (
          <Karsilama not={ekran.not} onceki={ekran.girdiler} onBaslat={(girdiler, sayim) => setEkran({ ad: 'ayiklama', girdiler, sayim })} />
        )}
        {ekran.ad === 'ayiklama' && (
          <Ayiklama
            girdiler={ekran.girdiler}
            sayim={ekran.sayim}
            gruplar={gruplar}
            onBitti={(sonuc, durduruldu) => {
              setMedya(sonuc);
              if (durduruldu) {
                setEkran({ ad: 'karsilama', girdiler: ekran.girdiler, not: 'Durduruldu. Tekrar “Ayıkla”ya basınca kaldığı yerden sürer.' });
              } else {
                setEkran({ ad: 'sonuc' });
              }
            }}
          />
        )}
        {ekran.ad === 'sonuc' && (
          <Sonuc medya={medya} setMedya={setMedya} gruplar={gruplar} setGruplar={setGruplar} onYeni={() => setEkran({ ad: 'karsilama' })} />
        )}
      </motion.main>
    </AnimatePresence>
    </MotionConfig>
  );
}
