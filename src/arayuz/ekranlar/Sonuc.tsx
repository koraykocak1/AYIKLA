import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { api } from '../api';
import { BuyukGorunum } from '../bilesenler/BuyukGorunum';
import { ELENECEK_ID, duzlestir, grupAdiBul, grupMenusu, menuAnahtari, yilAyGrupla } from '../mantik/gruplama';
import { ayAdi, elemeAdi, hataMetni, onizlemeAdresi, sayi } from '../mantik/bicim';
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

export function Sonuc({ medya, setMedya, gruplar, setGruplar, onYeni }: Props) {
  const menu = useMemo(() => grupMenusu(gruplar, medya), [gruplar, medya]);
  const [secili, setSecili] = useState<string>(() => menu[0]?.id ?? DIGER_ID);
  const bolumler = useMemo(() => yilAyGrupla(medya.filter((m) => menuAnahtari(m) === secili)), [medya, secili]);
  const liste = useMemo(() => duzlestir(bolumler), [bolumler]);
  const sira = useMemo(() => new Map(liste.map((m, i) => [m.anahtar, i])), [liste]);
  const [buyuk, setBuyuk] = useState<number | null>(null);
  const [sagTik, setSagTik] = useState<{ x: number; y: number; m: ArayuzMedya } | null>(null);
  const [yeniGrup, setYeniGrup] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [aktarim, setAktarim] = useState<{ bitti: number; toplam: number } | null>(null);

  const grupAdi = (id: string) => grupAdiBul(gruplar, id);
  const medyaGrupAdi = (m: ArayuzMedya) => (m.eleme ? `Elenecek › ${elemeAdi(m.eleme)}` : grupAdi(m.grupId));
  const seciliAd = menu.find((g) => g.id === secili)?.ad ?? grupAdi(secili);

  useEffect(() => api.olaylariDinle((o) => o.tur === 'aktarim' && setAktarim({ bitti: o.bitti, toplam: o.toplam })), []);
  useEffect(() => {
    const kapat = () => setSagTik(null);
    window.addEventListener('click', kapat);
    return () => window.removeEventListener('click', kapat);
  }, []);
  useEffect(() => {
    if (!bilgi) return;
    const t = window.setTimeout(() => setBilgi(null), 5000);
    return () => window.clearTimeout(t);
  }, [bilgi]);

  const guncelle = (yeni: ArayuzMedya) => setMedya((l) => l.map((m) => (m.anahtar === yeni.anahtar ? yeni : m)));

  async function tasi(m: ArayuzMedya, grupId: string) {
    try {
      guncelle(await api.grupTasi(m.anahtar, grupId));
      setBilgi(`“${grupAdi(grupId)}” grubuna taşındı`);
    } catch (h) {
      setBilgi(hataMetni(h));
    }
  }

  async function geriAl(m: ArayuzMedya) {
    try {
      guncelle(await api.geriAl(m.anahtar));
      setBilgi(`Geri alındı: “${grupAdi(m.grupId)}” grubunda`);
    } catch (h) {
      setBilgi(hataMetni(h));
    }
  }

  async function grupEkle(ad: string) {
    setBilgi('Yapay zekâ yeni grubu öğreniyor ve arşivi yeniden puanlıyor…');
    try {
      const r = await api.grupEkle(ad);
      setGruplar((g) => [...g.filter((x) => x.id !== r.grup.id), r.grup]);
      setMedya(r.sonuc);
      setSecili(r.grup.id);
      setBilgi(`“${r.grup.ad}” grubu eklendi`);
    } catch (h) {
      setBilgi('Grup eklenemedi: ' + hataMetni(h));
    }
  }

  async function aktar() {
    try {
      setAktarim(null);
      const r = await api.aktarSec();
      setAktarim(null);
      if (!r) return;
      const disk = r.hatalar.some((h) => /ENOSPC|no space/i.test(h.hata));
      setBilgi(
        disk
          ? `Disk doldu: ${sayi(r.kopyalanan)} dosya kopyalanabildi.`
          : `${sayi(r.kopyalanan)} dosya kopyalandı · ${sayi(r.atlanan)} zaten vardı${r.hatalar.length ? ` · ${sayi(r.hatalar.length)} hata` : ''}. Orijinaller yerinde duruyor.`,
      );
    } catch (h) {
      setAktarim(null);
      setBilgi('Kaydedilemedi: ' + hataMetni(h));
    }
  }

  return (
    <div className="sonuc">
      <aside className="yan">
        <div className="yan-ust">
          <span className="marka-kucuk">AYIKLA</span>
          <button className="metin-dugme" onClick={onYeni}>
            Yeni arşiv
          </button>
        </div>
        <nav>
          {menu.map((g) => (
            <div key={g.id} style={{ display: 'contents' }}>
              {g.ozel === 'diger' && <div className="ayrac" />}
              <button
                className={`grup${g.id === secili ? ' secili' : ''}${g.ozel === 'elenecek' ? ' elenecek' : ''}`}
                onClick={() => {
                  setSecili(g.id);
                  setBuyuk(null);
                }}
              >
                <span>{g.ad}</span>
                <span className="adet">{sayi(g.adet)}</span>
              </button>
            </div>
          ))}
        </nav>
        {yeniGrup === null ? (
          <button className="grup-ekle" onClick={() => setYeniGrup('')}>
            + Grup ekle
          </button>
        ) : (
          <form
            className="grup-ekle-form"
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
      </aside>

      <section className="icerik">
        <header className="sonuc-ust">
          <div>
            <h1>{seciliAd}</h1>
            <p className="soluk">
              {sayi(liste.length)} dosya{secili === ELENECEK_ID ? ' · silinmez; “Geri al” ile gruba döner' : ''}
            </p>
          </div>
          <button className="altin" onClick={() => void aktar()}>
            Klasörlere kaydet
          </button>
        </header>

        {aktarim && aktarim.bitti < aktarim.toplam && (
          <div className="ilerleme" title={`${aktarim.bitti} / ${aktarim.toplam}`}>
            <div style={{ width: `${(100 * aktarim.bitti) / Math.max(1, aktarim.toplam)}%` }} />
          </div>
        )}

        {liste.length === 0 && <p className="bos">Bu grupta dosya yok</p>}

        {bolumler.map((y) => (
          <section key={y.yil} className="yil">
            <h2>{y.yil}</h2>
            {y.aylar.map((a) => (
              <div key={a.ay} className="ay">
                <h3>
                  {ayAdi(a.ay)}
                  <span className="soluk">{sayi(a.medya.length)}</span>
                </h3>
                <div className="izgara">
                  {a.medya.map((m) => (
                    <div key={m.anahtar} className="kare-kap">
                      <button
                        className="kare"
                        title={medyaGrupAdi(m)}
                        onClick={() => setBuyuk(sira.get(m.anahtar) ?? 0)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setSagTik({ x: e.clientX, y: e.clientY, m });
                        }}
                      >
                        <img src={onizlemeAdresi(m.onizlemeler[0])} loading="lazy" alt="" style={{ background: m.renk }} />
                        {m.tur === 'video' && <span className="rozet video">▶ Video</span>}
                        {m.ham?.length ? (
                          <span className="rozet ham" title="Bu karenin RAW (NEF) dosyası da var; klasörlere kaydederken yanına kopyalanır">
                            RAW
                          </span>
                        ) : null}
                        {m.eleme && <span className="rozet eleme">{elemeAdi(m.eleme)}</span>}
                        {m.tahmini && (
                          <span className="rozet tahmini" title="Çekim tarihi bulunamadı, dosya tarihi kullanıldı">
                            ~
                          </span>
                        )}
                      </button>
                      {m.eleme && (
                        <button className="geri-al" onClick={() => void geriAl(m)}>
                          Geri al
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))}
      </section>

      {sagTik && (
        <div
          className="sag-menu"
          style={{ left: Math.min(sagTik.x, window.innerWidth - 240), top: Math.min(sagTik.y, window.innerHeight - 490) }}
          onClick={(e) => e.stopPropagation()}
        >
          {sagTik.m.eleme && (
            <button
              onClick={() => {
                void geriAl(sagTik.m);
                setSagTik(null);
              }}
            >
              Geri al (elenmesin)
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
        </div>
      )}

      <AnimatePresence>
        {buyuk !== null && <BuyukGorunum liste={liste} sira={buyuk} setSira={setBuyuk} grupAdi={medyaGrupAdi} />}
      </AnimatePresence>

      <AnimatePresence>
        {bilgi && (
          <motion.div className="bilgi" initial={{ opacity: 0, y: 12, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0 }}>
            {bilgi}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
