import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
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
    <AnimatePresence mode="wait">
      <motion.main
        key={ekran.ad}
        className="ekran"
        data-ekran={ekran.ad}
        initial={{ opacity: 0, scale: 1.02 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
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
  );
}
