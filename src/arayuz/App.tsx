import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { egri, sure } from './hareket';
import { api } from './api';
import { Karsilama } from './ekranlar/Karsilama';
import { Ayiklama } from './ekranlar/Ayiklama';
import { Sonuc } from './ekranlar/Sonuc';
import { Arsivim } from './ekranlar/Arsivim';
import { KorArkaPlan } from './bilesenler/KorArkaPlan';
import type { ArayuzMedya, Sayim } from '../ortak/mesajlar';
import type { Grup } from '../motor/tipler';

type Ekran =
  | { ad: 'acilis' }
  | { ad: 'karsilama'; not?: string; girdiler?: string[] }
  | { ad: 'ayiklama'; girdiler: string[]; sayim: Sayim }
  | { ad: 'sonuc' }
  | { ad: 'arsivim' };

export function App() {
  // Açılışta önce son ayıklama geri getirilir (önbellekten, yalnız yeni dosyalar işlenir); yoksa ana ekran
  const [ekran, setEkran] = useState<Ekran>({ ad: 'acilis' });
  const [yeniDosya, setYeniDosya] = useState<{ yeni: number; sira: number; toplam: number } | null>(null);
  const acilisBitti = useRef(false);
  const [gruplar, setGruplar] = useState<Grup[]>([]);
  const [medya, setMedya] = useState<ArayuzMedya[]>([]);
  // Ana ekrana dönünce son seçilen klasörler seçili gelir; "+ klasör ekle" ile yenisi eklenebilir
  const [sonGirdiler, setSonGirdiler] = useState<string[] | undefined>(undefined);

  useEffect(() => {
    api.gruplar().then(setGruplar).catch(() => {});
  }, []);

  useEffect(() => {
    const birak = api.olaylariDinle((o) => {
      if (o.tur === 'acilis' && !acilisBitti.current) setYeniDosya({ yeni: o.yeni, sira: o.sira, toplam: o.toplam });
    });
    const bitir = (e: Ekran) => {
      if (acilisBitti.current) return;
      acilisBitti.current = true;
      birak();
      setEkran(e);
    };
    api
      .acilis()
      .then((c) => {
        if (!c) return bitir({ ad: 'karsilama' });
        setMedya(c.sonuc);
        setSonGirdiler(c.girdiler);
        bitir({ ad: 'sonuc' });
      })
      .catch(() => bitir({ ad: 'karsilama' }));
    return () => {
      acilisBitti.current = true;
      birak();
    };
  }, []);

  /** Açılışı bekletmeden ana ekrana geçer; motordaki geri getirme durdurulur. */
  const acilistanCik = () => {
    if (acilisBitti.current) return;
    acilisBitti.current = true;
    void api.durdur();
    setEkran({ ad: 'karsilama' });
  };

  return (
    // Animasyonlar programın parçası: Windows'ta "Animasyon efektleri" kapalı olsa da çalışır (bkz. hareketiAzalt)
    <MotionConfig reducedMotion="never">
    <KorArkaPlan />
    <AnimatePresence mode="wait">
      <motion.main
        key={ekran.ad}
        className="ekran"
        data-ekran={ekran.ad}
        initial={{ opacity: 0, scale: 1.035, filter: 'blur(14px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', transition: { duration: sure.sinematik, ease: egri.yumusak } }}
        exit={{ opacity: 0, scale: 0.97, transition: { duration: sure.normal, ease: egri.cikis } }}
      >
        {ekran.ad === 'acilis' && (
          <div className="acilis" role="status">
            <p className="acilis-baslik">Son ayıklaman açılıyor…</p>
            <p className="soluk">
              {yeniDosya
                ? `${yeniDosya.yeni} yeni fotoğraf bulundu, gruplarına konuyor (${yeniDosya.sira} / ${yeniDosya.toplam})`
                : 'Yeni eklenen fotoğraflara bakılıyor; eskiler yeniden incelenmez.'}
            </p>
            <button className="metin-dugme" onClick={acilistanCik}>
              Ana ekrana geç ›
            </button>
          </div>
        )}
        {ekran.ad === 'karsilama' && (
          <Karsilama
            not={ekran.not}
            onceki={ekran.girdiler}
            onBaslat={(girdiler, sayim) => {
              setSonGirdiler(girdiler);
              setEkran({ ad: 'ayiklama', girdiler, sayim });
            }}
            onArsivim={() => setEkran({ ad: 'arsivim' })}
            onSonucaDon={medya.length ? () => setEkran({ ad: 'sonuc' }) : undefined}
          />
        )}
        {ekran.ad === 'arsivim' && <Arsivim onKapat={() => setEkran({ ad: 'karsilama' })} />}
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
          <Sonuc medya={medya} setMedya={setMedya} gruplar={gruplar} setGruplar={setGruplar} onYeni={() => setEkran({ ad: 'karsilama', girdiler: sonGirdiler })} />
        )}
      </motion.main>
    </AnimatePresence>
    </MotionConfig>
  );
}
