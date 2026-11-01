import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Color } from 'three';
import { api } from '../api';
import { Yigin, yeniKart, type YiginVerisi } from '../bilesenler/Yigin';
import { ELENECEK_KOSESI, etiketBoyu, etiketNoktasi, grupMerkezi, kumeKonumu, yuzde } from '../mantik/duzen';
import { ELENECEK_ID } from '../mantik/gruplama';
import { HizOlcer } from '../mantik/zaman';
import { elemeAdi, hataMetni, onizlemeAdresi, sayi, sonParca, sureMetni } from '../mantik/bicim';
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
  gruplanan: number;
  elenecek: number;
  kalan: number | null;
  toplam: number;
}

interface ModelDurumu {
  durum: 'yukleniyor' | 'hazir' | 'hata';
  cihaz?: string;
  hata?: string;
}

export function Ayiklama({ girdiler, sayim, gruplar, onBitti }: Props) {
  const bolgeler = useMemo(() => [...gruplar.map((g) => ({ id: g.id, ad: g.ad })), { id: DIGER_ID, ad: 'Diğer' }], [gruplar]);
  const sahne = useRef<HTMLDivElement>(null);
  const [en, setEn] = useState(1.6);
  const veri = useRef<YiginVerisi>({ toplam: sayim.foto + sayim.video, en: 1.6, bitti: false, kartlar: [], hedef: () => ({ x: 0, y: 0 }) });
  const [sayac, setSayac] = useState<Sayaclar>({ taranan: 0, gruplanan: 0, elenecek: 0, kalan: null, toplam: sayim.foto + sayim.video });
  const [adetler, setAdetler] = useState<Record<string, number>>({});
  const [model, setModel] = useState<ModelDurumu>({ durum: 'yukleniyor' });
  const [calisiyor, setCalisiyor] = useState(false);
  const [simdiki, setSimdiki] = useState<ArayuzMedya | null>(null);
  const [durduruluyor, setDurduruluyor] = useState(false);
  const [deneme, setDeneme] = useState(0);

  // Kartın hedefi o anki ekran oranından hesaplanır: pencere büyüyünce kümeler de kayar.
  veri.current.hedef = (grup, k, oran) => {
    if (grup === ELENECEK_ID) return kumeKonumu(ELENECEK_KOSESI(oran), k);
    const i = bolgeler.findIndex((b) => b.id === grup);
    return kumeKonumu(grupMerkezi(i < 0 ? bolgeler.length - 1 : i, bolgeler.length, oran), k);
  };

  useEffect(() => {
    const el = sahne.current;
    if (!el) return;
    const g = new ResizeObserver(() => {
      const o = el.clientWidth / Math.max(1, el.clientHeight);
      veri.current.en = o;
      setEn(o);
    });
    g.observe(el);
    return () => g.disconnect();
  }, []);

  useEffect(() => {
    const v = veri.current;
    const hiz = new HizOlcer();
    const kumeSayisi = new Map<string, number>();
    const kartlar = new Map<string, { i: number; grup: string; renk: string }>();
    let gruplanan = 0;
    let elenecek = 0;
    let sonKalkis = 0;

    function ucur(i: number, grup: string, renk: string) {
      while (v.kartlar.length <= i) v.kartlar.push(yeniKart());
      const k = kumeSayisi.get(grup) ?? 0;
      kumeSayisi.set(grup, k + 1);
      sonKalkis = Math.max(performance.now() / 1000, sonKalkis + 0.012); // kartlar art arda kalkar
      const kart = v.kartlar[i];
      kart.grup = grup;
      kart.k = k;
      kart.renk = new Color(renk);
      kart.kalkis = sonKalkis;
      kart.basladi = false;
    }
    const artir = (grup: string, n: number) => setAdetler((a) => ({ ...a, [grup]: (a[grup] ?? 0) + n }));

    const birak = api.olaylariDinle((o) => {
      if (o.tur === 'model') {
        setModel({ durum: o.durum, cihaz: o.cihaz, hata: o.hata });
      } else if (o.tur === 'basladi') {
        v.toplam = o.toplam;
        setCalisiyor(true);
        setModel((m) => ({ ...m, durum: 'hazir' }));
        setSayac((s) => ({ ...s, toplam: o.toplam }));
      } else if (o.tur === 'dosya') {
        const grup = o.medya.eleme ? ELENECEK_ID : o.medya.grupId;
        if (o.medya.eleme) elenecek++;
        else gruplanan++;
        kartlar.set(o.medya.anahtar, { i: o.sira - 1, grup, renk: o.medya.renk });
        ucur(o.sira - 1, grup, o.medya.renk);
        artir(grup, 1);
        hiz.ekle(performance.now());
        setSimdiki(o.medya);
        setSayac({ taranan: o.sira, gruplanan, elenecek, kalan: hiz.kalan(o.toplam - o.sira), toplam: o.toplam });
      } else if (o.tur === 'kopyalar') {
        for (const a of o.anahtarlar) {
          const k = kartlar.get(a);
          if (!k || k.grup === ELENECEK_ID) continue;
          artir(k.grup, -1);
          artir(ELENECEK_ID, 1);
          gruplanan--;
          elenecek++;
          k.grup = ELENECEK_ID;
          ucur(k.i, ELENECEK_ID, k.renk);
        }
        setSayac((s) => ({ ...s, gruplanan, elenecek }));
      } else if (o.tur === 'bitti') {
        v.bitti = true;
        setSayac((s) => ({ ...s, kalan: 0 }));
        window.setTimeout(() => onBitti(o.sonuc, o.durduruldu), o.durduruldu ? 300 : 2200);
      }
    });
    api.baslat(girdiler).catch((h) => setModel({ durum: 'hata', hata: hataMetni(h) }));
    return birak;
  }, [deneme]);

  const grupAdi = (m: ArayuzMedya) => (m.eleme ? `Elenecek › ${elemeAdi(m.eleme)}` : (bolgeler.find((b) => b.id === m.grupId)?.ad ?? 'Diğer'));
  const durumMetni =
    model.durum === 'yukleniyor'
      ? 'Yapay zekâ hazırlanıyor… (ilk açılışta ~350 MB iner)'
      : calisiyor
        ? `Yapay zekâ ${model.cihaz === 'dml' ? 'ekran kartında' : 'işlemcide'} çalışıyor`
        : '';

  return (
    <div className="ayiklama" data-durum={calisiyor ? 'calisiyor' : 'hazirlaniyor'}>
      <div className="sahne" ref={sahne}>
        <Yigin veri={veri} />
      </div>

      <div className="ust-serit">
        <span className="marka-kucuk">AYIKLA</span>
        <span className="durum">{durumMetni}</span>
        <button
          className="ikincil"
          disabled={durduruluyor || model.durum === 'hata'}
          onClick={() => {
            setDurduruluyor(true);
            void api.durdur();
          }}
        >
          {durduruluyor ? 'Durduruluyor…' : 'Durdur'}
        </button>
      </div>

      <div className="sayaclar">
        <SayacKarti etiket="Taranan" deger={`${sayi(sayac.taranan)} / ${sayi(sayac.toplam)}`} />
        <SayacKarti etiket="Gruplanan" deger={sayi(sayac.gruplanan)} vurgu />
        <SayacKarti etiket="Elenecek" deger={sayi(sayac.elenecek)} />
        <SayacKarti etiket="Kalan süre" deger={sureMetni(sayac.kalan)} />
      </div>

      {bolgeler.map((b, i) => (
        <Etiket
          key={b.id}
          ad={b.ad}
          adet={adetler[b.id] ?? 0}
          konum={yuzde(etiketNoktasi(grupMerkezi(i, bolgeler.length, en), adetler[b.id] ?? 0), en)}
        />
      ))}
      <Etiket
        ad="Elenecekler"
        adet={adetler[ELENECEK_ID] ?? 0}
        konum={yuzde(etiketNoktasi(ELENECEK_KOSESI(en), adetler[ELENECEK_ID] ?? 0), en)}
        elenecek
      />

      <AnimatePresence>
        {simdiki && (
          <motion.div className="simdiki" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <img src={onizlemeAdresi(simdiki.onizlemeler[0])} alt="" />
            <div>
              <div className="ad">{sonParca(simdiki.yol)}</div>
              <div className="soluk">{grupAdi(simdiki)}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {model.durum === 'hata' && (
        <div className="model-uyari">
          <p className="birakma-baslik">Ayıklama başlatılamadı</p>
          <p className="soluk">İlk açılışta yapay zekâ modeli internetten bir kez iner (~350 MB). Bağlantını kontrol edip tekrar dene.</p>
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

function SayacKarti({ etiket, deger, vurgu }: { etiket: string; deger: string; vurgu?: boolean }) {
  return (
    <div className={`sayac${vurgu ? ' vurgu' : ''}`}>
      <div className="etiket">{etiket}</div>
      <div className="deger">{deger}</div>
    </div>
  );
}

function Etiket({ ad, adet, konum, elenecek }: { ad: string; adet: number; konum: { sol: number; ust: number }; elenecek?: boolean }) {
  return (
    <AnimatePresence>
      {adet > 0 && (
        <motion.div
          className={`grup-etiketi${elenecek ? ' elenecek' : ''}`}
          style={{ left: `${konum.sol}%`, top: `${konum.ust}%`, x: '-50%', y: '-100%' }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="ad" style={{ fontSize: etiketBoyu(adet) }}>
            {ad}
          </span>
          <span className="adet">{sayi(adet)}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
