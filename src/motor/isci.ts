import { mkdir } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { tara, hamEsleriniAyir } from './tarayici';
import { tarihBul, komsuTarihiUygula } from './tarih';
import { fotoOnizleme } from './onizleme';
import { videoBilgisi, kareCikar } from './ffmpeg';
import { kaliteOlc } from './kalite';
import { parmakiziHesapla, kopyaKumeleri } from './parmakizi';
import { hamMi } from './ham';
import { grupSec, ortalamaVektor, type GrupVektoru } from './sahne-puan';
import { DIGER_ID, EKRAN_ID, ekranGoruntusuAdiMi, puanlamaTarifleri } from './gruplar';
import { anahtarUret, katalogAc } from './katalog';
import { ortalamaRenk } from './renk';
import type { Grup, IsciOlayi, IslenmisMedya, MedyaDosyasi, SahneModeli } from './tipler';

export interface IsciAyarlari {
  girdiler: string[];
  calismaKlasoru: string;
  gruplar: Grup[];
  model: SahneModeli;
  olay: (o: IsciOlayi) => void;
  durdur?: AbortSignal;
}

export async function grupVektorleriHazirla(gruplar: Grup[], model: SahneModeli): Promise<GrupVektoru[]> {
  const sonuc: GrupVektoru[] = [];
  for (const p of puanlamaTarifleri(gruplar)) sonuc.push({ grupId: p.grupId, vektorler: await model.metinVektorleri(p.tarifler) });
  return sonuc;
}

export function grupBelirle(m: IslenmisMedya, gv: GrupVektoru[]): string {
  if (m.elleGrup) return m.elleGrup;
  const ad = basename(m.yol);
  if (m.tur === 'foto' && ekranGoruntusuAdiMi(ad) && gv.some((g) => g.grupId === EKRAN_ID)) return EKRAN_ID;
  // Yapay zekâ insanlı fotoğrafları da "ekran görüntüsü" sanabiliyor: bu grup yalnızca PNG'lerde yarışır.
  const png = m.tur === 'foto' && extname(ad).toLowerCase() === '.png';
  return grupSec(m.vektor, png ? gv : gv.filter((g) => g.grupId !== EKRAN_ID)).grupId;
}

/** Kayıtlı vektörlerle grupları yeniden belirler; fotoğraflar yeniden taranmaz. */
export async function yenidenPuanla(liste: IslenmisMedya[], gruplar: Grup[], model: SahneModeli): Promise<IslenmisMedya[]> {
  const gv = await grupVektorleriHazirla(gruplar, model);
  for (const m of liste) m.grupId = grupBelirle(m, gv);
  return liste;
}

async function dosyayiIsle(d: MedyaDosyasi, anahtar: string, klasor: string, model: SahneModeli): Promise<IslenmisMedya> {
  const tarih = await tarihBul(d);
  const onizlemeler: string[] = [];
  let genislik = 0;
  let yukseklik = 0;

  if (d.tur === 'foto') {
    const hedef = join(klasor, `${anahtar}.jpg`);
    const b = await fotoOnizleme(d.yol, hedef);
    genislik = b.genislik;
    yukseklik = b.yukseklik;
    onizlemeler.push(hedef);
  } else {
    const v = await videoBilgisi(d.yol);
    genislik = v.genislik;
    yukseklik = v.yukseklik;
    const anlar = v.sure > 0 ? [0.1, 0.5, 0.9].map((o) => v.sure * o) : [0];
    for (let k = 0; k < anlar.length; k++) {
      const hedef = join(klasor, `${anahtar}-${k}.jpg`);
      await kareCikar(d.yol, anlar[k], hedef);
      onizlemeler.push(hedef);
    }
  }

  const ana = onizlemeler[Math.floor(onizlemeler.length / 2)];
  const kalite = await kaliteOlc(ana);
  const parmakizi = await parmakiziHesapla(ana);
  const vektorler: number[][] = [];
  for (const o of onizlemeler) vektorler.push(await model.resimVektoru(o));

  return {
    anahtar, yol: d.yol, tur: d.tur, boyut: d.boyut, degisme: d.degisme,
    tarih: tarih.tarih.toISOString(), tarihKaynagi: tarih.kaynak, tahmini: tarih.tahmini,
    onizlemeler, genislik, yukseklik, kalite, parmakizi,
    vektor: ortalamaVektor(vektorler), grupId: DIGER_ID, eleme: null,
  };
}

function kopyalariIsaretle(liste: IslenmisMedya[]): string[] {
  const anahtarlar: string[] = [];
  for (const tur of ['foto', 'video'] as const) {
    const adaylar = liste.filter((m) => m.tur === tur && m.eleme === null && !m.geriAlindi);
    // JPG gibi görüntülenebilir dosya, aynı karenin RAW'ına tercih edilir (çözünürlüğü düşük olsa da);
    // elenen RAW kaybolmasın diye kalan dosyaya "RAW eşi" olarak bağlanır ve onunla birlikte dışa aktarılır.
    const puan = (m: IslenmisMedya) => (hamMi(m.yol) ? 0 : 1e12) + m.genislik * m.yukseklik + m.kalite.netlik;
    for (const { kalan, elenen } of kopyaKumeleri(adaylar, puan)) {
      for (const m of elenen) {
        m.eleme = 'kopya';
        anahtarlar.push(m.anahtar);
        if (hamMi(m.yol) && !hamMi(kalan.yol)) kalan.ham = [...(kalan.ham ?? []), m.yol];
      }
    }
  }
  return anahtarlar;
}

export async function ayikla(a: IsciAyarlari): Promise<IslenmisMedya[]> {
  const { islenecek: dosyalar, esler } = hamEsleriniAyir(await tara(a.girdiler, { haric: [a.calismaKlasoru] }));
  const kayit = await katalogAc(a.calismaKlasoru);
  // Önbellekteki küçük resimler: arayüz dönen yığını baştan gerçek fotoğraflarla doldurur
  const onizlemeler = dosyalar.map((d) => kayit.al(anahtarUret(d))?.onizlemeler[0] ?? null);
  a.olay({ tur: 'basladi', toplam: dosyalar.length, onizlemeler });
  if (a.durdur?.aborted) return [];
  const onizlemeKlasoru = join(a.calismaKlasoru, 'onizleme');
  await mkdir(onizlemeKlasoru, { recursive: true });
  const gv = await grupVektorleriHazirla(a.gruplar, a.model);

  const sonuc: IslenmisMedya[] = [];
  // Katalog yalnızca yeni bir şey öğrenildiyse yazılır: önbellekten gelen arşivde veritabanına boşuna dokunmamak için.
  let degisti = false;
  for (let i = 0; i < dosyalar.length; i++) {
    if (a.durdur?.aborted) break;
    const d = dosyalar[i];
    const anahtar = anahtarUret(d);
    try {
      let m = kayit.al(anahtar);
      if (!m) {
        m = await dosyayiIsle(d, anahtar, onizlemeKlasoru, a.model);
        kayit.koy(m);
        degisti = true;
      }
      if (m.kalite.aydinlik === undefined) {
        // Eski sürümün kaydı: karanlık kuralı değişti, kalite küçük resimden yeniden ölçülür (fotoğraf yeniden taranmaz)
        m.kalite = await kaliteOlc(m.onizlemeler[Math.floor(m.onizlemeler.length / 2)]);
        degisti = true;
      }
      if (!m.renk) {
        m.renk = await ortalamaRenk(m.onizlemeler[0]);
        degisti = true;
      }
      m.ham = esler.get(d.yol);
      m.grupId = grupBelirle(m, gv);
      // Kullanıcı kararı (2026-11-11): karanlık ve bulanık kareler elenmez (gece ve bilerek bulanık çekilenler
      // de istenir); normal gruplarına gider. Elenecekler'de yalnız kopyalar ve elle ayrılanlar kalır.
      m.eleme = m.geriAlindi ? null : m.elleElendi ? 'elle' : null;
      sonuc.push(m);
      a.olay({ tur: 'dosya', medya: m, sira: i + 1, toplam: dosyalar.length });
    } catch (h) {
      a.olay({ tur: 'okunamadi', yol: d.yol, hata: h instanceof Error ? h.message : String(h) });
    }
    if ((i + 1) % 25 === 0 && degisti) {
      await kayit.kaydet();
      degisti = false;
    }
  }

  if (a.durdur?.aborted) {
    if (degisti) await kayit.kaydet();
    return sonuc;
  }
  komsuTarihiUygula(sonuc);
  a.olay({ tur: 'kopyalar', anahtarlar: kopyalariIsaretle(sonuc) });
  if (degisti) await kayit.kaydet();
  a.olay({ tur: 'bitti', sonuc });
  return sonuc;
}
