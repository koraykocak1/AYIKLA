import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { AnimatePresence, motion, useSpring } from 'motion/react';
import { api } from '../api';
import { BuyukGorunum } from '../bilesenler/BuyukGorunum';
import { KartSahnesi, type Gorunum } from '../bilesenler/KartSahnesi';
import { ELENECEK_ID, duzlestir, grupAdiBul, grupMenusu, menuAnahtari, yilAyGrupla } from '../mantik/gruplama';
import { elemeAdi, hataMetni, sayi } from '../mantik/bicim';
import { egri, sure, yay } from '../hareket';
import { DIGER_ID } from '../../motor/gruplar';
import type { ArayuzMedya } from '../../ortak/mesajlar';
import type { Grup } from '../../motor/tipler';

interface Props {
  medya: ArayuzMedya[];
  setMedya: Dispatch<SetStateAction<ArayuzMedya[]>>;
  gruplar: Grup[];
  setGruplar: Dispatch<SetStateAction<Grup[]>>;
  onYeni: () => void;
}

interface Bilgi {
  metin: string;
  geriAl?: () => void;
}

const UCUS_MS = 560; // taşınan kartın soldaki gruba uçma süresi

export function Sonuc({ medya, setMedya, gruplar, setGruplar, onYeni }: Props) {
  const menu = useMemo(() => grupMenusu(gruplar, medya), [gruplar, medya]);
  const [secili, setSecili] = useState<string>(() => menu[0]?.id ?? DIGER_ID);
  const bolumler = useMemo(() => yilAyGrupla(medya.filter((m) => menuAnahtari(m) === secili)), [medya, secili]);
  const liste = useMemo(() => duzlestir(bolumler), [bolumler]);
  const [gorunum, setGorunum] = useState<Gorunum>('izgara');
  const [buyuk, setBuyuk] = useState<number | null>(null);
  const [acilis, setAcilis] = useState<DOMRect | null>(null);
  const [ucanlar, setUcanlar] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [sagTik, setSagTik] = useState<{ x: number; y: number; m: ArayuzMedya } | null>(null);
  const [yeniGrup, setYeniGrup] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<Bilgi | null>(null);
  const [aktarim, setAktarim] = useState<{ bitti: number; toplam: number } | null>(null);
  const grupDugmeleri = useRef(new Map<string, HTMLButtonElement>());

  const grupAdi = (id: string) => grupAdiBul(gruplar, id);
  const medyaGrupAdi = (m: ArayuzMedya) => (m.eleme ? `Elenecek › ${elemeAdi(m.eleme)}` : grupAdi(m.grupId));
  const seciliAd = menu.find((g) => g.id === secili)?.ad ?? grupAdi(secili);
  const yillar = bolumler.map((b) => b.yil);
  const yilAraligi = yillar.length ? (yillar.length > 1 ? `${Math.min(...yillar)}–${Math.max(...yillar)}` : String(yillar[0])) : '';

  useEffect(() => api.olaylariDinle((o) => o.tur === 'aktarim' && setAktarim({ bitti: o.bitti, toplam: o.toplam })), []);
  useEffect(() => {
    const kapat = () => setSagTik(null);
    window.addEventListener('click', kapat);
    return () => window.removeEventListener('click', kapat);
  }, []);
  useEffect(() => {
    if (!bilgi) return;
    const t = window.setTimeout(() => setBilgi(null), 6000);
    return () => window.clearTimeout(t);
  }, [bilgi]);

  // İmleci yavaşça izleyen soluk sarı ışık
  const haleX = useSpring(-400, { stiffness: 40, damping: 18 });
  const haleY = useSpring(-400, { stiffness: 40, damping: 18 });
  useEffect(() => {
    const izle = (e: PointerEvent) => {
      haleX.set(e.clientX);
      haleY.set(e.clientY);
    };
    window.addEventListener('pointermove', izle);
    return () => window.removeEventListener('pointermove', izle);
  }, []);

  /** Kart görünümden ayrılıyorsa önce soldaki grubunun üstüne uçar, sonra listede güncellenir. */
  async function guncelle(yeni: ArayuzMedya) {
    const hedefId = menuAnahtari(yeni);
    const dugme = grupDugmeleri.current.get(hedefId);
    if (hedefId !== secili && dugme) {
      const k = dugme.getBoundingClientRect();
      setUcanlar((u) => new Map(u).set(yeni.anahtar, { x: k.left + 24, y: k.top + k.height / 2 }));
      await new Promise((r) => window.setTimeout(r, UCUS_MS));
    }
    setMedya((l) => l.map((m) => (m.anahtar === yeni.anahtar ? yeni : m)));
    setUcanlar((u) => {
      const y = new Map(u);
      y.delete(yeni.anahtar);
      return y;
    });
  }

  async function tasi(m: ArayuzMedya, grupId: string, geriAlinabilir = true) {
    try {
      await guncelle(await api.grupTasi(m.anahtar, grupId));
      const eski = m.grupId;
      setBilgi({
        metin: `“${grupAdi(grupId)}” grubuna taşındı`,
        // Elenecekten taşınan geri alınamaz (eleme nedeni yeniden kurulamaz)
        geriAl: geriAlinabilir && !m.eleme ? () => void tasi({ ...m, grupId }, eski, false) : undefined,
      });
    } catch (h) {
      setBilgi({ metin: hataMetni(h) });
    }
  }

  async function geriAl(m: ArayuzMedya) {
    try {
      await guncelle(await api.geriAl(m.anahtar));
      setBilgi({ metin: `Elenmeyecek: “${grupAdi(m.grupId)}” grubuna döndü` });
    } catch (h) {
      setBilgi({ metin: hataMetni(h) });
    }
  }

  async function grupEkle(ad: string) {
    setBilgi({ metin: 'Yapay zekâ yeni grubu öğreniyor ve arşivi yeniden puanlıyor…' });
    try {
      const r = await api.grupEkle(ad);
      setGruplar((g) => [...g.filter((x) => x.id !== r.grup.id), r.grup]);
      setMedya(r.sonuc);
      setSecili(r.grup.id);
      setBilgi({ metin: `“${r.grup.ad}” grubu eklendi` });
    } catch (h) {
      setBilgi({ metin: 'Grup eklenemedi: ' + hataMetni(h) });
    }
  }

  async function aktar() {
    try {
      setAktarim(null);
      const r = await api.aktarSec();
      setAktarim(null);
      if (!r) return;
      const disk = r.hatalar.some((h) => /ENOSPC|no space/i.test(h.hata));
      setBilgi({
        metin: disk
          ? `Disk doldu: ${sayi(r.kopyalanan)} dosya kopyalanabildi.`
          : `${sayi(r.kopyalanan)} dosya kopyalandı · ${sayi(r.atlanan)} zaten vardı${r.hatalar.length ? ` · ${sayi(r.hatalar.length)} hata` : ''}. Orijinaller yerinde duruyor.`,
      });
    } catch (h) {
      setAktarim(null);
      setBilgi({ metin: 'Kaydedilemedi: ' + hataMetni(h) });
    }
  }

  const toplam = medya.length;
  const kaydediliyor = aktarim && aktarim.bitti < aktarim.toplam;

  return (
    <div className="sonuc">
      <motion.div className="s-hale" aria-hidden="true" style={{ x: haleX, y: haleY }} />

      {/* Kaydetme ilerlemesi: üstte ince sarı çizgi */}
      <div className="a-ilerleme" aria-hidden="true" style={{ opacity: kaydediliyor ? 1 : 0 }}>
        <motion.div
          className="a-ilerleme-dolu"
          animate={{ scaleX: aktarim ? aktarim.bitti / Math.max(1, aktarim.toplam) : 0 }}
          transition={{ duration: sure.normal, ease: egri.yumusak }}
        />
      </div>

      <aside className="s-yan">
        <p className="k-marka">
          <span className="k-isaret" aria-hidden="true" />
          AYIKLA
        </p>
        <nav>
          {menu.map((g) => (
            <div key={g.id} style={{ display: 'contents' }}>
              {g.ozel === 'diger' && <div className="s-ayrac" />}
              <motion.button
                layout="position"
                ref={(el) => {
                  if (el) grupDugmeleri.current.set(g.id, el);
                  else grupDugmeleri.current.delete(g.id);
                }}
                className={`s-grup${g.id === secili ? ' secili' : ''}${g.ozel === 'elenecek' ? ' elenecek' : ''}`}
                onClick={() => {
                  setSecili(g.id);
                  setBuyuk(null);
                }}
              >
                {g.id === secili && <motion.span className="s-isaret" layoutId="s-isaret" transition={yay.canli} />}
                <span className="s-ad">{g.ad}</span>
                {/* Sayı değişince kısa bir an parlar */}
                <motion.span
                  key={g.adet}
                  className="s-adet"
                  initial={{ scale: 1.4, color: '#fde047' }}
                  animate={{ scale: 1, color: g.id === secili ? '#facc15' : '#78716c' }}
                  transition={{ duration: sure.yavas, ease: egri.yumusak }}
                >
                  {sayi(g.adet)}
                </motion.span>
              </motion.button>
            </div>
          ))}
        </nav>
        {yeniGrup === null ? (
          <button className="s-grup-ekle etiket" onClick={() => setYeniGrup('')}>
            + Grup ekle
          </button>
        ) : (
          <form
            className="s-grup-form"
            onSubmit={(e) => {
              e.preventDefault();
              const ad = yeniGrup.trim();
              setYeniGrup(null);
              if (ad) void grupEkle(ad);
            }}
          >
            <input
              autoFocus
              value={yeniGrup}
              placeholder="Örn. Araba — Enter’a bas"
              onChange={(e) => setYeniGrup(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setYeniGrup(null)}
            />
          </form>
        )}
        <div className="s-yan-alt">
          <p className="etiket soluk">
            Toplam <span className="s-toplam">{sayi(toplam)}</span>
          </p>
          <button className="metin-dugme etiket" onClick={onYeni}>
            Yeni arşiv
          </button>
        </div>
      </aside>

      <section className="s-icerik">
        <header className="s-ust">
          <motion.div
            key={secili}
            initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: sure.yavas, ease: egri.yumusak }}
          >
            <h1>{seciliAd}</h1>
            <p className="etiket soluk">
              {sayi(liste.length)} dosya{yilAraligi && ` · ${yilAraligi}`}
              {secili === ELENECEK_ID ? ' · silinmez; sağ tık › geri al' : ''}
            </p>
          </motion.div>
          <div className="s-araclar">
            <div className="s-anahtar" role="tablist" aria-label="Görünüm">
              {(['izgara', 'kure'] as const).map((g) => (
                <button key={g} role="tab" aria-selected={gorunum === g} className={gorunum === g ? 'secili' : ''} onClick={() => setGorunum(g)}>
                  {gorunum === g && <motion.span className="s-anahtar-isik" layoutId="s-anahtar" transition={yay.canli} />}
                  <span>{g === 'izgara' ? 'Izgara' : 'Küre'}</span>
                </button>
              ))}
            </div>
            <button className="altin" disabled={!!kaydediliyor} onClick={() => void aktar()}>
              {kaydediliyor ? `Kaydediliyor · %${Math.round((100 * aktarim!.bitti) / Math.max(1, aktarim!.toplam))}` : 'Klasörlere kaydet ›'}
            </button>
          </div>
        </header>

        {/* Grup değişince eski kartlar düşüp söner, yenileri sırayla uçarak gelir */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={secili}
            className="s-sahne"
            exit={{ opacity: 0, y: 40, filter: 'blur(6px)', transition: { duration: sure.normal, ease: egri.cikis } }}
          >
            {liste.length === 0 ? (
              <p className="s-bos etiket soluk">Bu grupta dosya yok</p>
            ) : (
              <KartSahnesi
                bolumler={bolumler}
                liste={liste}
                gorunum={gorunum}
                ucanlar={ucanlar}
                onAc={(i, kutu) => {
                  setAcilis(kutu);
                  setBuyuk(i);
                }}
                onSagTik={(e, m) => setSagTik({ x: e.clientX, y: e.clientY, m })}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </section>

      <AnimatePresence>
        {sagTik && (
          <motion.div
            key={`${sagTik.x}-${sagTik.y}`}
            className="sag-menu"
            style={{ left: Math.min(sagTik.x, window.innerWidth - 240), top: Math.min(sagTik.y, window.innerHeight - 420), transformOrigin: 'top left' }}
            initial={{ opacity: 0, scale: 0.92, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: yay.canli }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: sure.hizli, ease: egri.cikis } }}
            onClick={(e) => e.stopPropagation()}
          >
            {sagTik.m.eleme && (
              <button
                className="vurgu"
                onClick={() => {
                  void geriAl(sagTik.m);
                  setSagTik(null);
                }}
              >
                Geri al · elenmesin
              </button>
            )}
            <p className="menu-baslik">Şu gruba taşı</p>
            {[...gruplar, { id: DIGER_ID, ad: 'Diğer' }]
              .filter((g) => g.id !== sagTik.m.grupId || sagTik.m.eleme)
              .map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    void tasi(sagTik.m, g.id);
                    setSagTik(null);
                  }}
                >
                  {g.ad}
                </button>
              ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {buyuk !== null && <BuyukGorunum liste={liste} sira={buyuk} setSira={setBuyuk} grupAdi={medyaGrupAdi} acilis={acilis} />}
      </AnimatePresence>

      <AnimatePresence>
        {bilgi && (
          <motion.div
            className="bilgi"
            role="status"
            initial={{ opacity: 0, y: 12, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 6, x: '-50%' }}
          >
            <span>{bilgi.metin}</span>
            {bilgi.geriAl && (
              <button
                className="bilgi-geri etiket"
                onClick={() => {
                  bilgi.geriAl?.();
                  setBilgi(null);
                }}
              >
                Geri al
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
