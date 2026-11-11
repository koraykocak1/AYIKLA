import { useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { AkanSayi } from '../bilesenler/AkanSayi';
import { NoktaKure } from '../bilesenler/NoktaKure';
import { egri, siraliGecikme, sure, yay } from '../hareket';
import { AnimatePresence, motion } from 'motion/react';
import { api } from '../api';
import { Hakkinda } from '../bilesenler/Hakkinda';
import { bulunduMetni, hataMetni, sayi, sonParca, tarihMetni } from '../mantik/bicim';
import type { ModelDurumuCevabi, Sayim } from '../../ortak/mesajlar';
import type { SonArsiv } from '../../motor/tipler';

interface Props {
  not?: string;
  onceki?: string[];
  onBaslat: (girdiler: string[], sayim: Sayim) => void;
  onArsivim: () => void;
  /** Son ayıklamanın sonucu varsa: sonuç ekranına yeniden ayıklamadan döner. */
  onSonucaDon?: () => void;
}

/** Klasör bırakılınca sayımın görünmesi için başlamadan önce kısa bekleyiş. */
const OTOMATIK_BASLAMA_MS = 1400;

/** Kayıt dosyası bozuk çıkıp kenara alındıysa kullanıcıya bir kez söylenecek cümle. */
export function katalogNotuMetni(kurtarilan: string | null): string | null {
  if (!kurtarilan) return null;
  const ad = sonParca(kurtarilan);
  return ad.startsWith('katalog.db')
    ? `Kayıt dosyan bozuk çıktı. Silmedim, kenara aldım: ${ad}. Eski kayıtlarından yeniden kuruldu; son düzeltmelerin o dosyada kalmış olabilir.`
    : `Eski kayıt dosyan okunamadı. Silmedim, kenara aldım: ${ad}. Ayıklama yeni bir kayıtla sürüyor.`;
}

/** Yumuşak beliriş (gecikme saniye cinsinden). */
const belir = (gecikme: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: sure.yavas, ease: egri.yumusak, delay: gecikme },
});

/** Windows'un özel klasörleri diskte İngilizce adlı; Gezgin'deki Türkçe adlarıyla gösterilir. */
const TURKCE_AD: Record<string, string> = { pictures: 'Resimler', desktop: 'Masaüstü', downloads: 'İndirilenler', documents: 'Belgeler' };

export function Karsilama({ not, onceki, onBaslat, onSonucaDon }: Props) {
  const [girdiler, setGirdiler] = useState<string[] | null>(null);
  const [sayim, setSayim] = useState<Sayim | null>(null);
  const [sayiliyor, setSayiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [ustunde, setUstunde] = useState(false);
  const [arsivler, setArsivler] = useState<SonArsiv[]>([]);

  const [basliyor, setBasliyor] = useState(false);
  // Modeller inmemişse ayıklamadan önce indirme onayı istenir (boyut, kaynak, lisans gösterilir)
  const [onay, setOnay] = useState<ModelDurumuCevabi | null>(null);
  const [onaylaniyor, setOnaylaniyor] = useState(false);
  const [katalogNotu, setKatalogNotu] = useState<string | null>(null);
  const [hakkinda, setHakkinda] = useState(false);
  const [sonlarAcik, setSonlarAcik] = useState(false);
  const zamanlayici = useRef<number | undefined>(undefined);
  useEffect(() => () => clearTimeout(zamanlayici.current), []);

  /**
   * Klasörü seçer ve dosyaları sayar. `kendiliginden` ise (küreye bırakma, klasör seçme, son arşiv)
   * sayım görünür görünmez kısa bir bekleyişten sonra ayıklama kendiliğinden başlar.
   * Açılışta hatırlanan klasörde ise başlamaz: kullanıcı ortadaki "ayıkla"ya basar (ör. durdurulunca devam).
   */
  async function sec(g: string[], kendiliginden = false) {
    if (!g.length) return;
    clearTimeout(zamanlayici.current);
    setHakkinda(false); // klasör seçilince Hakkında kutusu ve son ayıklananlar listesi kapanır
    setSonlarAcik(false);
    setBasliyor(false);
    setOnay(null);
    setGirdiler(g);
    setSayim(null);
    setHata(null);
    setSayiliyor(true);
    try {
      const s = await api.say(g);
      setSayim(s);
      if (kendiliginden && s.foto + s.video > 0 && (await indirmeSorulmadi())) {
        setBasliyor(true);
        zamanlayici.current = window.setTimeout(() => onBaslat(g, s), OTOMATIK_BASLAMA_MS);
      }
    } catch (h) {
      setHata(hataMetni(h));
    } finally {
      setSayiliyor(false);
    }
  }

  /** Model diskteyse true; inmemişse onay kutusunu açar ve false döner. Durum okunamazsa motor yine onaysız indirmez. */
  async function indirmeSorulmadi(): Promise<boolean> {
    // Kullanıcı kararı (2026-11-09): onay kutusu yok; model ilk ayıklamada kendiliğinden bir kez iner.
    // Bilgisi Hakkında'da. İzin kaydedilemezse eski kutu yedek olarak açılır.
    const d = await api.modelDurumu().catch(() => null);
    if (d?.indirmeGerekli) {
      try {
        await api.modelIzniVer();
      } catch {
        setOnay(d);
        return false;
      }
    }
    return true;
  }

  async function baslat() {
    if (!girdiler || !sayim) return;
    if (await indirmeSorulmadi()) onBaslat(girdiler, sayim);
  }

  async function indirVeBaslat() {
    if (!girdiler || !sayim) return;
    setOnaylaniyor(true);
    try {
      await api.modelIzniVer();
      onBaslat(girdiler, sayim);
    } catch (h) {
      setHata(hataMetni(h));
      setOnaylaniyor(false);
    }
  }

  useEffect(() => {
    api
      .sonArsivler()
      .then(setArsivler)
      .catch(() => {});
    api
      .katalogDurumu()
      .then((d) => setKatalogNotu(katalogNotuMetni(d.kurtarilan)))
      .catch(() => {});
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
    const yollar = Array.from(e.dataTransfer.files)
      .map((f) => api.yolAl(f))
      .filter(Boolean);
    void sec(yollar, true);
  }

  async function klasorSec() {
    const k = await api.klasorSec();
    if (k) void sec([k], true);
  }

  /** Seçili klasörlere bir tane daha ekler; önceden ayıklananlar anında gelir, yalnız yeni klasör işlenir. */
  async function klasorEkle() {
    const k = await api.klasorSec();
    if (k && girdiler) void sec([...girdiler.filter((g) => g.toLowerCase() !== k.toLowerCase()), k]);
  }

  /** Resimler, Masaüstü, İndirilenler, Belgeler (ve varsa OneDrive): bütün disk taranmaz. */
  async function bilgisayardaBul() {
    const l = await api.bilinenKlasorler().catch(() => []);
    if (l.length) void sec(l, true); // "Klasör seç" gibi: sayım bitince ayıklama kendiliğinden başlar
    else setHata('Resimler, Masaüstü gibi klasörler bulunamadı. "Klasör seç" ile kendin seç.');
  }

  const hazir = !!(girdiler && sayim && sayim.foto + sayim.video > 0);
  const yonerge = ustunde
    ? 'Bırak'
    : onay
      ? 'Önce yapay zekâ inmeli'
      : basliyor
      ? 'Ayıklama başlıyor…'
      : hazir
        ? 'Başlamak için ortadaki AYIKLA yazısına tıkla'
        : 'Klasörü küreye bırak';

  return (
    // Bütün ekran bırakma alanı: klasör nereye bırakılırsa bırakılsın küreye düşer
    <div
      className={`karsilama${ustunde ? ' ustunde' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setUstunde(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setUstunde(false);
      }}
      onDrop={birak}
    >
      <motion.div
        className="kure-kap"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: ustunde ? 1.03 : 1 }}
        transition={ustunde ? yay.yumusak : { duration: sure.sinematik * 1.6, ease: egri.yumusak }}
      >
        <NoktaKure parlak={ustunde} />
      </motion.div>

      {/* Üst şerit: marka solda, açıklama sağda */}
      <header className="k-ust">
        <motion.p className="k-marka" {...belir(0.5)}>
          <span className="k-isaret" aria-hidden="true" />
          AYIKLA
        </motion.p>
        <motion.p className="etiket soluk" {...belir(0.6)}>
          Fotoğrafları sahneye ve tarihe göre ayıklar
        </motion.p>
      </header>

      {/* Kürenin ortası */}
      <div className="kure-orta">
        <motion.h1
          initial={{ opacity: 0, y: 16, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: sure.sinematik, ease: egri.yumusak, delay: 0.25 }}
        >
          {/* Ortadaki kelime aynı zamanda başlatma düğmesi (yalnız sayım hazırken basılabilir) */}
          <button
            className={`k-baslat${hazir && !basliyor ? ' hazir' : ''}`}
            aria-label="Ayıkla"
            disabled={!hazir || basliyor || onaylaniyor}
            onClick={() => void baslat()}
          >
            ayıkla
          </button>
        </motion.h1>
        <motion.p className="k-yonerge etiket" {...belir(0.55)}>
          {yonerge}
        </motion.p>
        <AnimatePresence>
          {girdiler && (
            <motion.div className="secim" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p className="secilen etiket">{girdiler.map((g) => TURKCE_AD[sonParca(g).toLowerCase()] ?? sonParca(g)).join(', ')}</p>
              {!basliyor && !sayiliyor && (
                <button className="metin-dugme etiket k-ekle" onClick={() => void klasorEkle()}>
                  + klasör ekle
                </button>
              )}
              {onSonucaDon && !basliyor && (
                <button className="altin k-sonuca" onClick={onSonucaDon}>
                  Sonuçlara dön ›
                </button>
              )}
              {sayiliyor && <p className="etiket soluk">Dosyalar sayılıyor…</p>}
              {sayim && (
                <p className="bulundu" aria-label={bulunduMetni(sayim)}>
                  <BulunduSayaci sayim={sayim} />
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {onay && (
            <motion.section
              className="model-onay"
              aria-label="Yapay zekâ indirme onayı"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: sure.yavas, ease: egri.yumusak }}
            >
              <p className="mo-baslik">Ayıklamak için yapay zekâ bir kez internetten iner</p>
              <p className="soluk">Sonra internetsiz çalışır. Fotoğrafların hiçbir yere gönderilmez.</p>
              <ul>
                {onay.paketler.map((p) => (
                  <li key={p.id}>
                    <span className="mo-ad">
                      {p.ad} · {p.gorev.toLocaleLowerCase('tr')}
                    </span>
                    <span className="mo-boyut">~{sayi(p.boyutMB)} MB</span>
                    <span className="mo-ayrinti">
                      Kaynak: HuggingFace ({p.id}) · Lisans: kod {p.kodLisansi}, ağırlık {p.agirlikLisansi}
                      {p.id.includes('opus') && ' · yalnız grup eklersen iner'}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mo-dugmeler">
                <button className="ikincil" disabled={onaylaniyor} onClick={() => setOnay(null)}>
                  Şimdi değil
                </button>
                <button className="altin" disabled={onaylaniyor} onClick={() => void indirVeBaslat()}>
                  {onaylaniyor ? 'Başlıyor…' : 'İndir ve ayıkla'}
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
        <AnimatePresence>{hakkinda && !onay && <Hakkinda onKapat={() => setHakkinda(false)} />}</AnimatePresence>
        {katalogNotu && <p className="not">{katalogNotu}</p>}
        {not && <p className="not">{not}</p>}
        {hata && <p className="hata">{hata}</p>}
      </div>

      {/* Alt şerit: son arşivler solda, klasör seç sağda — ikisi aynı alt çizgide */}
      <footer className="k-alt">
        <div className="k-alt-sol">
          {/* Son ayıklananlar: yalnız tıklanınca açılır */}
          {arsivler.length > 0 && sonlarAcik && (
            <section className="son-arsivler" aria-label="Son ayıklananlar">
              <ul>
                {arsivler.slice(0, 3).map((a, i) => (
                  <motion.li key={a.girdiler.join('|')} {...belir(0.85 + siraliGecikme(i, 0.06))}>
                    <button onClick={() => void sec(a.girdiler, true)}>
                      <span className="ad">{a.girdiler.map(sonParca).join(', ')}</span>
                      <span className="etiket soluk">
                        {sayi(a.foto + a.video)} dosya · {tarihMetni(a.tarih)}
                      </span>
                    </button>
                  </motion.li>
                ))}
              </ul>
            </section>
          )}
          {arsivler.length > 0 && (
            <motion.button className="hakkinda-dugme etiket soluk" onClick={() => setSonlarAcik((a) => !a)} {...belir(0.9)}>
              Son ayıklananlar {sonlarAcik ? '▴' : '▾'}
            </motion.button>
          )}
          <motion.button className="hakkinda-dugme etiket soluk" onClick={() => setHakkinda((h) => !h)} {...belir(0.9)}>
            Hakkında
          </motion.button>
        </div>
        <motion.div className="k-alt-sag" {...belir(0.8)}>
          <button className="ikincil" onClick={() => void bilgisayardaBul()} title="Resimler, Masaüstü, İndirilenler ve Belgeler taranır">
            Bilgisayarımdaki fotoğrafları bul
          </button>
          <button className="ikincil" onClick={() => void klasorSec()}>
            Klasör seç
          </button>
        </motion.div>
      </footer>
    </div>
  );
}

/** "1.240 fotoğraf · 86 video bulundu" — sayılar akarak artar. */
function BulunduSayaci({ sayim }: { sayim: Sayim }) {
  if (sayim.foto + sayim.video === 0) return <>{bulunduMetni(sayim)}</>;
  const parcalar: ReactNode[] = [];
  if (sayim.foto)
    parcalar.push(
      <span key="f">
        <AkanSayi deger={sayim.foto} /> fotoğraf
      </span>,
    );
  if (sayim.video)
    parcalar.push(
      <span key="v">
        <AkanSayi deger={sayim.video} /> video
      </span>,
    );
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
