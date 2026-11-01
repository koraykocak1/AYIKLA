import { mkdir } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { tara } from './tarayici';
import { tarihBul } from './tarih';
import { fotoOnizleme } from './onizleme';
import { videoBilgisi, kareCikar } from './ffmpeg';
import { kaliteOlc } from './kalite';
import { parmakiziHesapla, kopyalariBul } from './parmakizi';
import { grupSec, ortalamaVektor, type GrupVektoru } from './sahne-puan';
import { DIGER_ID, EKRAN_ID, ekranGoruntusuAdiMi } from './gruplar';
import { KayitDeposu, anahtarUret } from './kayit';
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
  for (const g of gruplar) sonuc.push({ grupId: g.id, vektorler: await model.metinVektorleri(g.tarifler) });
  return sonuc;
}

export function grupBelirle(m: IslenmisMedya, gv: GrupVektoru[]): string {
  if (m.elleGrup) return m.elleGrup;
  if (m.tur === 'foto' && ekranGoruntusuAdiMi(basename(m.yol)) && gv.some((g) => g.grupId === EKRAN_ID)) return EKRAN_ID;
  return grupSec(m.vektor, gv).grupId;
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
    const elenen = kopyalariBul(adaylar, (m) => m.genislik * m.yukseklik + m.kalite.netlik);
    for (const m of elenen) {
      m.eleme = 'kopya';
      anahtarlar.push(m.anahtar);
    }
  }
  return anahtarlar;
}

export async function ayikla(a: IsciAyarlari): Promise<IslenmisMedya[]> {
  const dosyalar = await tara(a.girdiler);
  a.olay({ tur: 'basladi', toplam: dosyalar.length });
  if (a.durdur?.aborted) return [];

  const kayit = new KayitDeposu(join(a.calismaKlasoru, 'kayit.json'));
  await kayit.yukle();
  const onizlemeKlasoru = join(a.calismaKlasoru, 'onizleme');
  await mkdir(onizlemeKlasoru, { recursive: true });
  const gv = await grupVektorleriHazirla(a.gruplar, a.model);

  const sonuc: IslenmisMedya[] = [];
  // Kayıt yalnızca yeni bir şey öğrenildiyse yazılır: önbellekten gelen arşivde büyük JSON'u boşuna yazmamak için.
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
      if (!m.renk) {
        m.renk = await ortalamaRenk(m.onizlemeler[0]);
        degisti = true;
      }
      m.grupId = grupBelirle(m, gv);
      m.eleme = m.geriAlindi ? null : m.tur === 'foto' ? (m.kalite.karanlik ? 'karanlik' : m.kalite.bulanik ? 'bulanik' : null) : null;
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
  a.olay({ tur: 'kopyalar', anahtarlar: kopyalariIsaretle(sonuc) });
  if (degisti) await kayit.kaydet();
  a.olay({ tur: 'bitti', sonuc });
  return sonuc;
}
