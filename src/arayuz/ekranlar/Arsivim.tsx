import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { api } from '../api';
import { YedekKutusu } from '../bilesenler/YedekKutusu';
import { egri, sure, yay } from '../hareket';
import { ayAdi, hataMetni, sayi } from '../mantik/bicim';
import { BAYAT_KILIT, type ArsivGorunumu, type ArsivIslemi, type ArsivOgesi, type ArsivSorgusu } from '../../ortak/mesajlar';

const GUN_MS = 86_400_000;
const etiketGoster = (yol: string) => yol.replaceAll(' > ', ' › ');

/** Yıl → ay → öğe (yeniden eskiye; tarihi olmayanlar sonda). */
function yilAy(ogeler: ArsivOgesi[]) {
  const yillar = new Map<number, Map<number, ArsivOgesi[]>>();
  for (const o of ogeler) {
    const t = o.tarih ? new Date(o.tarih) : null;
    const y = t ? t.getFullYear() : 0;
    const a = t ? t.getMonth() + 1 : 0;
    if (!yillar.has(y)) yillar.set(y, new Map());
    const aylar = yillar.get(y)!;
    if (!aylar.has(a)) aylar.set(a, []);
    aylar.get(a)!.push(o);
  }
  return [...yillar].sort((p, q) => q[0] - p[0]).map(([yil, aylar]) => ({ yil, aylar: [...aylar].sort((p, q) => q[0] - p[0]) }));
}

/** Arşivim (taslak 2. parça) ve Kutu (3. parça). */
export function Arsivim({ onKapat }: { onKapat: () => void }) {
  const [sorgu, setSorgu] = useState<ArsivSorgusu>({});
  const [metin, setMetin] = useState('');
  const [g, setG] = useState<ArsivGorunumu | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [bayat, setBayat] = useState(false);
  const [secili, setSecili] = useState<Set<number>>(new Set());
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [yeniAlbum, setYeniAlbum] = useState<string | null>(null);
  const [etiketMetni, setEtiketMetni] = useState<string | null>(null);
  const [albumMenusu, setAlbumMenusu] = useState<{ x: number; y: number } | null>(null);
  const [kaliciOnay, setKaliciOnay] = useState(false);
  const [yedek, setYedek] = useState(false);
  const [yenile, setYenile] = useState(0);

  // Arama yazarken her harfte değil, kısa bir duraktan sonra sorulur
  useEffect(() => {
    const t = window.setTimeout(() => setSorgu((s) => ({ ...s, metin: metin.trim() || undefined })), 250);
    return () => window.clearTimeout(t);
  }, [metin]);

  useEffect(() => {
    let iptal = false;
    api.arsivGoster(sorgu).then(
      (r) => {
        if (iptal) return;
        setG(r);
        setHata(null);
        setBayat(false);
        setSecili((s) => new Set([...s].filter((id) => r.ogeler.some((o) => o.id === id))));
      },
      (h) => {
        if (iptal) return;
        const m = hataMetni(h);
        setBayat(m.startsWith(BAYAT_KILIT));
        setHata(m.startsWith(BAYAT_KILIT) ? null : m);
      },
    );
    return () => {
      iptal = true;
    };
  }, [sorgu, yenile]);

  useEffect(() => {
    if (!bilgi) return;
    const t = window.setTimeout(() => setBilgi(null), 6000);
    return () => window.clearTimeout(t);
  }, [bilgi]);

  const bolumler = useMemo(() => yilAy(g?.ogeler ?? []), [g]);
  const idler = [...secili];
  const kutuda = !!sorgu.kutu;
  const sec = (s: ArsivSorgusu) => {
    setSorgu({ ...s, metin: sorgu.metin });
    setSecili(new Set());
  };

  async function islem(i: ArsivIslemi, mesaj: string) {
    try {
      await api.arsivIslem(i);
      setBilgi(mesaj);
      setYenile((n) => n + 1);
    } catch (h) {
      setBilgi(hataMetni(h));
    }
  }

  async function kilidiKaldir() {
    try {
      await api.bayatKilidiKaldir();
      setYenile((n) => n + 1);
    } catch (h) {
      setHata(hataMetni(h));
    }
  }

  return (
    <div className="arsivim">
      <header className="ar-ust">
        <button className="etiket ar-baslik" onClick={onKapat} title="Karşılama ekranına dön">
          ‹ Arşivim
        </button>
        <input className="ar-ara" value={metin} placeholder="2024 deniz" aria-label="Arşivde ara" onChange={(e) => setMetin(e.target.value)} />
        <button className="ikincil" onClick={() => setYedek(true)}>
          Yedek
        </button>
      </header>

      <div className="ar-govde">
        <aside className="ar-yan">
          <p className="menu-baslik">albümler</p>
          <nav>
            <YanDugme ad="Tümü" secili={!sorgu.albumId && !sorgu.etiket && !kutuda} onClick={() => sec({})} />
            {g?.albumler.map((a) => (
              <YanDugme key={a.id} ad={a.ad} adet={a.adet} secili={sorgu.albumId === a.id} onClick={() => sec({ albumId: a.id })} />
            ))}
          </nav>
          {yeniAlbum === null ? (
            <button className="s-grup-ekle etiket" onClick={() => setYeniAlbum('')}>
              + albüm
            </button>
          ) : (
            <form
              className="s-grup-form"
              onSubmit={(e) => {
                e.preventDefault();
                const ad = yeniAlbum.trim();
                setYeniAlbum(null);
                if (ad) void islem({ islem: 'albumOlustur', ad }, `“${ad}” albümü oluşturuldu`);
              }}
            >
              <input autoFocus value={yeniAlbum} placeholder="Albüm adı" onChange={(e) => setYeniAlbum(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && setYeniAlbum(null)} />
            </form>
          )}
          <p className="menu-baslik">etiketler</p>
          <nav>
            {g?.etiketler.map((e) => (
              <YanDugme key={e} ad={etiketGoster(e)} secili={sorgu.etiket === e} onClick={() => sec({ etiket: e })} />
            ))}
          </nav>
          <div className="s-ayrac" />
          <YanDugme ad="Kutu" adet={g?.kutuAdet ?? 0} secili={kutuda} onClick={() => sec({ kutu: true })} />
        </aside>

        <section className="ar-icerik">
          {bayat && (
            <p className="not">
              Bu arşiv son kullanımda düzgün kapatılmamış. Başka yerde açık değilse kilidi kaldırıp devam edebilirsin.{' '}
              <button className="metin-dugme etiket" onClick={() => void kilidiKaldir()}>
                Devam et
              </button>
            </p>
          )}
          {hata && <p className="not">{hata}</p>}

          {/* Seçim satırı */}
          {!kutuda && secili.size > 0 && (
            <div className="ar-secim etiket">
              <span className="s-alim">seçili {sayi(secili.size)}</span>
              {' · '}
              <button className="metin-dugme etiket" onClick={(e) => setAlbumMenusu({ x: e.clientX, y: e.clientY })}>
                albüme ekle
              </button>
              {' · '}
              {etiketMetni === null ? (
                <button className="metin-dugme etiket" onClick={() => setEtiketMetni('')}>
                  etiketle
                </button>
              ) : (
                <form
                  className="s-grup-form ar-etiket-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const yol = etiketMetni.trim();
                    setEtiketMetni(null);
                    if (yol) void islem({ islem: 'etiketle', idler, yol }, `“${yol}” etiketi eklendi`);
                  }}
                >
                  <input autoFocus value={etiketMetni} placeholder="Yer › Deniz" onChange={(e) => setEtiketMetni(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && setEtiketMetni(null)} />
                </form>
              )}
              {sorgu.albumId && (
                <>
                  {' · '}
                  <button
                    className="metin-dugme etiket"
                    onClick={() => void islem({ islem: 'albumdenKaldir', albumId: sorgu.albumId!, idler }, 'Albümden kaldırıldı; arşivde duruyor')}
                  >
                    albümden kaldır
                  </button>
                </>
              )}
              {' · '}
              <button className="metin-dugme etiket" onClick={() => void islem({ islem: 'kutuyaTasi', idler }, `${sayi(idler.length)} öğe kutuya taşındı; 30 gün içinde geri alınabilir`)}>
                sil
              </button>
            </div>
          )}

          <div className="ar-izgara">
            {g && g.ogeler.length === 0 && <p className="s-bos etiket soluk">{kutuda ? 'Kutu boş' : 'Burada öğe yok'}</p>}
            {bolumler.map(({ yil, aylar }) => (
              <div key={yil}>
                <div className="ks-yil">
                  {yil || 'Tarihsiz'} <span>{sayi(aylar.reduce((t, [, l]) => t + l.length, 0))}</span>
                </div>
                {aylar.map(([ay, liste]) => (
                  <div key={ay}>
                    {ay > 0 && (
                      <div className="ks-ay">
                        {String(ay).padStart(2, '0')}-{ayAdi(ay)} <span>· {sayi(liste.length)} öğe</span>
                      </div>
                    )}
                    <div className="ar-kartlar">
                      {liste.map((o) => (
                        <div key={o.id}>
                          <button
                            className={`ks-resim ar-kare${secili.has(o.id) ? ' secili' : ''}`}
                            aria-pressed={secili.has(o.id)}
                            title={o.ad}
                            onClick={() =>
                              setSecili((s) => {
                                const y = new Set(s);
                                if (y.has(o.id)) y.delete(o.id);
                                else y.add(o.id);
                                return y;
                              })
                            }
                          >
                            {o.tur === 'video' && <span className="rozet video">▶ Video</span>}
                          </button>
                          <p className="ks-etiket">
                            {o.ad}
                            {o.kaliciSilinme && ` · ${Math.max(0, Math.ceil((Date.parse(o.kaliciSilinme) - Date.now()) / GUN_MS))} gün kaldı`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {kutuda && (
            <footer className="ar-alt">
              <p className="soluk">Kaynak klasörlerindeki dosyalar hiçbir zaman silinmez.</p>
              <div className="mo-dugmeler">
                <button className="ikincil" disabled={!secili.size} onClick={() => setKaliciOnay(true)}>
                  Kalıcı sil
                </button>
                <button className="altin" disabled={!secili.size} onClick={() => void islem({ islem: 'kutudanGeriAl', idler }, `${sayi(idler.length)} öğe geri alındı`)}>
                  Geri al
                </button>
              </div>
            </footer>
          )}
        </section>
      </div>

      <AnimatePresence>
        {albumMenusu && (
          <motion.div
            className="sag-menu"
            style={{ left: Math.min(albumMenusu.x, window.innerWidth - 240), top: albumMenusu.y + 8 }}
            initial={{ opacity: 0, scale: 0.92, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: yay.canli }}
            exit={{ opacity: 0, transition: { duration: sure.hizli, ease: egri.cikis } }}
            onMouseLeave={() => setAlbumMenusu(null)}
          >
            <p className="menu-baslik">Şu albüme ekle</p>
            {g?.albumler.length ? (
              g.albumler.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    setAlbumMenusu(null);
                    void islem({ islem: 'albumeEkle', albumId: a.id, idler }, `“${a.ad}” albümüne eklendi`);
                  }}
                >
                  {a.ad}
                </button>
              ))
            ) : (
              <p className="menu-baslik">Önce soldan “+ albüm” ile bir albüm oluştur</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {kaliciOnay && (
          <motion.div className="s-perde" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.section className="model-onay" role="dialog" aria-label="Kalıcı sil" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}>
              <p className="mo-baslik">{sayi(secili.size)} öğe kalıcı olarak silinsin mi?</p>
              <p className="soluk">Arşivdeki kopyaları geri alınamaz şekilde silinir. Kaynak klasörlerindeki dosyalar hiçbir zaman silinmez.</p>
              <div className="mo-dugmeler">
                <button className="ikincil" onClick={() => setKaliciOnay(false)}>
                  Vazgeç
                </button>
                <button
                  className="altin"
                  onClick={() => {
                    setKaliciOnay(false);
                    void islem({ islem: 'kaliciSil', idler }, `${sayi(idler.length)} öğe kalıcı olarak silindi`);
                  }}
                >
                  Kalıcı sil
                </button>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{yedek && <YedekKutusu onKapat={() => setYedek(false)} onGeriYuklendi={() => setYenile((n) => n + 1)} />}</AnimatePresence>

      <AnimatePresence>
        {bilgi && (
          <motion.div className="bilgi" role="status" initial={{ opacity: 0, y: 12, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 6, x: '-50%' }}>
            <span>{bilgi}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function YanDugme({ ad, adet, secili, onClick }: { ad: string; adet?: number; secili: boolean; onClick: () => void }) {
  return (
    <button className={`s-grup${secili ? ' secili' : ''}`} onClick={onClick}>
      {secili && <motion.span className="s-isaret" layoutId="ar-isaret" transition={yay.canli} />}
      <span className="s-ad">{ad}</span>
      {adet !== undefined && <span className="s-adet">{sayi(adet)}</span>}
    </button>
  );
}
