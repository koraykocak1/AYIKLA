import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { egri, halka, kure, sure, yay } from '../hareket';
import { api } from '../api';
import { AyiklaYazisi } from '../bilesenler/AyiklaYazisi';
import { GrupKureleri } from '../bilesenler/GrupKureleri';
import { NoktaKure } from '../bilesenler/NoktaKure';
import { YildizTozu } from '../bilesenler/YildizTozu';
import { ELENECEK_ID } from '../mantik/gruplama';
import { halkaYeri, kuyrugaEkle, yeniSahne, type AyiklamaSahnesi, type SahneGrubu } from '../mantik/sahneDuzeni';
import { HizOlcer } from '../mantik/zaman';
import { hataMetni, sayi, sureMetni } from '../mantik/bicim';
import { DIGER_ID } from '../../motor/gruplar';
import type { ArayuzMedya, Sayim } from '../../ortak/mesajlar';
import type { Grup } from '../../motor/tipler';

interface Props {
  girdiler: string[];
  sayim: Sayim;
  gruplar: Grup[];
  onBitti: (sonuc: ArayuzMedya[], durduruldu: boolean) => void;
}

interface Sayaclar {
  taranan: number;
  kalan: number | null;
  toplam: number;
}

interface ModelDurumu {
  durum: 'izinGerekli' | 'yukleniyor' | 'hazir' | 'hata';
  cihaz?: string;
  hata?: string;
}

const TOZ_BEKLEME_SINIRI = 8000; // bitince son tozların kürelere varması için en çok bu kadar beklenir (ms)

/** Şeritlerdeki yazıların kısa, sırayla gelişi. */
const belir = (gecikme: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: sure.yavas, ease: egri.yumusak, delay: gecikme },
});

export function Ayiklama({ girdiler, sayim, gruplar, onBitti }: Props) {
  // Üstteki küreler: gruplar + Diğer + Elenecek
  const kureler = useMemo<SahneGrubu[]>(
    () => [
      ...gruplar.map((g) => ({ id: g.id, ad: g.ad })),
      { id: DIGER_ID, ad: 'Diğer' },
      { id: ELENECEK_ID, ad: 'Elenecek', elenecek: true },
    ],
    [gruplar],
  );
  const kureRef = useRef(kureler);
  kureRef.current = kureler;
  const sahne = useRef<AyiklamaSahnesi>(yeniSahne());
  // Karşılamadaki büyük küre ortadan küçülerek aşağıdaki yerine iner (iki ekran arasında kopukluk olmasın)
  const kureYeri = useRef((W: number, H: number, sn: number) => {
    const son = halkaYeri(W, H, sahne.current.ilerleme);
    const u = Math.min(sn / halka.inis, 1);
    const e = u < 0.5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2;
    const basR = Math.min(W, H) * kure.yaricapOrani;
    return { x: W / 2 + (son.x - W / 2) * e, y: H / 2 + (son.y - H / 2) * e, r: basR + (son.r - basR) * e };
  }).current;
  const [sayac, setSayac] = useState<Sayaclar>({ taranan: 0, kalan: null, toplam: sayim.foto + sayim.video });
  const [model, setModel] = useState<ModelDurumu>({ durum: 'yukleniyor' });
  const [calisiyor, setCalisiyor] = useState(false);
  const [durduruluyor, setDurduruluyor] = useState(false);
  const [deneme, setDeneme] = useState(0);
  const [bitis, setBitis] = useState<{ adet: number; sure: number } | null>(null);

  useEffect(() => {
    const s = sahne.current;
    const hiz = new HizOlcer();
    const yerler = new Map<string, string>(); // dosya anahtarı → gittiği küre (kopya çıkınca taşımak için)
    const zamanlayicilar: number[] = [];
    let bekleme = 0;
    const baslangic = performance.now();

    // Önbellekten gelen arşivde binlerce olay art arda gelir: ekran durumu olay başına değil, kare başına bir kez güncellenir
    let sayacYerel: Sayaclar | null = null;
    let planli = 0;
    const yenile = () => {
      if (planli) return;
      planli = requestAnimationFrame(() => {
        planli = 0;
        if (sayacYerel) setSayac(sayacYerel);
      });
    };
    const kureyeGore = (id: string) => (kureRef.current.some((k) => k.id === id) ? id : DIGER_ID);

    const birak = api.olaylariDinle((o) => {
      if (o.tur === 'model') {
        setModel({ durum: o.durum, cihaz: o.cihaz, hata: o.hata });
      } else if (o.tur === 'basladi') {
        setCalisiyor(true);
        setModel((m) => ({ ...m, durum: 'hazir' }));
        setSayac((x) => ({ ...x, toplam: o.toplam }));
      } else if (o.tur === 'dosya') {
        const grup = o.medya.eleme ? ELENECEK_ID : kureyeGore(o.medya.grupId);
        yerler.set(o.medya.anahtar, grup);
        kuyrugaEkle(s, grup);
        hiz.ekle(performance.now());
        s.ilerleme = o.toplam ? o.sira / o.toplam : 0;
        sayacYerel = { taranan: o.sira, kalan: hiz.kalan(o.toplam - o.sira), toplam: o.toplam };
        yenile();
      } else if (o.tur === 'kopyalar') {
        for (const a of o.anahtarlar) {
          const grup = yerler.get(a);
          if (!grup || grup === ELENECEK_ID) continue;
          yerler.set(a, ELENECEK_ID);
          kuyrugaEkle(s, ELENECEK_ID, grup); // küresinden kopup elenecek küresine süzülür
        }
      } else if (o.tur === 'bitti') {
        if (sayacYerel) sayacYerel = { ...sayacYerel, kalan: 0 };
        yenile();
        if (o.durduruldu) {
          zamanlayicilar.push(window.setTimeout(() => onBitti(o.sonuc, true), 300));
          return;
        }
        // Son tozlar kürelerine varınca "tamamlandı" anı, ardından sonuç ekranı
        const sureSn = (performance.now() - baslangic) / 1000;
        const bitti = performance.now();
        bekleme = window.setInterval(() => {
          const yolda = s.kuyruk.length > 0 || s.ucan > 0;
          if (yolda && performance.now() - bitti < TOZ_BEKLEME_SINIRI) return;
          clearInterval(bekleme);
          setBitis({ adet: o.sonuc.length, sure: sureSn });
          zamanlayicilar.push(window.setTimeout(() => onBitti(o.sonuc, false), 2400));
        }, 200);
      }
    });
    api.baslat(girdiler).catch((h) => setModel({ durum: 'hata', hata: hataMetni(h) }));
    return () => {
      birak();
      cancelAnimationFrame(planli);
      clearInterval(bekleme);
      zamanlayicilar.forEach((z) => clearTimeout(z));
    };
  }, [deneme]);

  const oran = sayac.toplam ? Math.min(1, sayac.taranan / sayac.toplam) : 0;
  const durumMetni =
    model.durum === 'yukleniyor'
      ? 'Yapay zekâ hazırlanıyor…'
      : calisiyor
        ? `Yapay zekâ ${model.cihaz === 'dml' ? 'ekran kartında' : 'işlemcide'}`
        : '';

  return (
    <div className="ayiklama" data-durum={calisiyor ? 'calisiyor' : 'hazirlaniyor'}>
      {/* Üstte ince sarı ilerleme çizgisi */}
      <div className="a-ilerleme" aria-hidden="true">
        <motion.div className="a-ilerleme-dolu" animate={{ scaleX: oran }} transition={{ duration: sure.normal, ease: egri.yumusak }} />
      </div>

      <div className="a-sahne">
        <GrupKureleri sahne={sahne} gruplar={kureler} toplam={sayac.toplam} />
        <NoktaKure yer={kureYeri} />
        <AyiklaYazisi />
        <YildizTozu sahne={sahne} gruplar={kureler} />
      </div>

      <header className="a-ust">
        <motion.p className="k-marka" {...belir(0.2)}>
          <span className="k-isaret" aria-hidden="true" />
          AYIKLA
        </motion.p>
        <motion.p className="etiket soluk" {...belir(0.3)}>
          {durumMetni}
        </motion.p>
      </header>

      <footer className="a-alt">
        <motion.div {...belir(0.4)}>
          <p className="a-yuzde etiket" role="status">
            {durduruluyor ? 'Durduruluyor' : oran >= 1 ? 'Tamamlanıyor' : 'Ayıklanıyor'} <span className="a-nokta">·</span> <span className="a-sayi">%{Math.round(oran * 100)}</span>
          </p>
          <p className="a-ayrinti etiket">
            {sayi(sayac.taranan)} / {sayi(sayac.toplam)}
            {sayac.kalan != null && sayac.kalan > 0 && <> · Kalan {sureMetni(sayac.kalan)}</>}
          </p>
        </motion.div>
        <motion.button
          className="ikincil"
          {...belir(0.5)}
          disabled={durduruluyor || model.durum === 'hata' || !!bitis}
          onClick={() => {
            setDurduruluyor(true);
            void api.durdur();
          }}
        >
          {durduruluyor ? 'Durduruluyor…' : 'Durdur'}
        </motion.button>
      </footer>

      <AnimatePresence>
        {bitis && (
          <motion.div
            className="bitis"
            initial={{ opacity: 0, scale: 0.92, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: sure.yavas, ease: egri.yumusak }}
          >
            <motion.div
              className="bitis-isaret"
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ ...yay.zipla, delay: 0.15 }}
            >
              ✓
            </motion.div>
            <p className="bitis-baslik">Ayıklama tamamlandı</p>
            <p className="etiket soluk">
              {sayi(bitis.adet)} dosya · {sureMetni(bitis.sure)}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {model.durum === 'hata' && (
        <div className="model-uyari">
          <p className="birakma-baslik">Ayıklama başlatılamadı</p>
          <p className="soluk">İlk açılışta yapay zekâ modeli internetten bir kez iner (~610 MB). Bağlantını kontrol edip tekrar dene.</p>
          {model.hata && <p className="hata">{model.hata}</p>}
          <button
            className="altin"
            onClick={() => {
              setModel({ durum: 'yukleniyor' });
              setDeneme((d) => d + 1);
            }}
          >
            Tekrar dene
          </button>
        </div>
      )}
    </div>
  );
}
