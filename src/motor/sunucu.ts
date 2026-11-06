import { ortalamaRenk } from './renk';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Arsiv, ArsivHatasi, arsivKimligiOku, arsivOlustur } from './arsiv';
import { iceAl, type IceAlinacak } from './arsiv-depo';
import { ayikla, yenidenPuanla } from './isci';
import { tara, hamEsleriniAyir } from './tarayici';
import { type Katalog, katalogAc } from './katalog';
import { HAZIR_GRUPLAR, DIGER_ID, kullaniciGrubu } from './gruplar';
import { disariAktar, hedefSorunu, type AktarmaSonucu } from './disari-aktar';
import { CEVIRI_PAKETI, CLIP_PAKETI, ModelIzniGerekliHatasi, type ModelIzni } from './model-izni';
import { arayuzIcin, type ArayuzMedya, type ArayuzOlayi, type ArsivAlimSonucu, type ArsivDurumuCevabi, type IsciIstegi, type IsciMesaji, type KatalogDurumuCevabi, type ModelDurumuCevabi, type Sayim } from '../ortak/mesajlar';
import type { Grup, IslenmisMedya, SahneModeli } from './tipler';

export interface SunucuAyarlari {
  calismaKlasoru: string;
  /** uzaktanIzin false ise model yalnız diskten açılmalı (ağa çıkılmaz). */
  modelYukle: (uzaktanIzin: boolean) => Promise<SahneModeli>;
  cevir: (metin: string, uzaktanIzin: boolean) => Promise<string>;
  /** İndirme onayı: onay yoksa ve model diskte eksikse hiçbir yükleyici çağrılmaz. */
  modelIzni: ModelIzni;
  gonder: (m: IsciMesaji) => void;
}

function hataMetni(h: unknown): string {
  return h instanceof Error ? h.message : String(h);
}

/** İşçi sürecin beyni: istekleri işler, motor olaylarını arayüze uygun hâle getirip yollar. */
export function sunucuOlustur(a: SunucuAyarlari) {
  let modelSozu: Promise<SahneModeli> | null = null;
  let durdurucu: AbortController | null = null;
  let son: IslenmisMedya[] = [];
  let sonGirdiler: string[] = [];

  const olay = (o: ArayuzOlayi) => a.gonder({ tur: 'olay', olay: o });

  function model(): Promise<SahneModeli> {
    if (!modelSozu) {
      modelSozu = a.modelIzni
        .uzaktanIzin(CLIP_PAKETI)
        .then((uzak) => {
          olay({ tur: 'model', durum: 'yukleniyor' });
          return a.modelYukle(uzak);
        })
        .then(
          (m) => {
            olay({ tur: 'model', durum: 'hazir', cihaz: m.cihaz });
            return m;
          },
          (h: unknown) => {
            modelSozu = null;
            if (h instanceof ModelIzniGerekliHatasi) olay({ tur: 'model', durum: 'izinGerekli' });
            else olay({ tur: 'model', durum: 'hata', hata: hataMetni(h) });
            throw h;
          },
        );
    }
    return modelSozu;
  }

  /** Kartın rengi: motor kaydettiyse o, yoksa (eski kayıt) bir kez hesaplanır. */
  async function renk(m: IslenmisMedya): Promise<string> {
    if (!m.renk) m.renk = await ortalamaRenk(m.onizlemeler[0]);
    return m.renk;
  }
  const disa = async (m: IslenmisMedya): Promise<ArayuzMedya> => arayuzIcin(m, await renk(m));
  const disaListe = (l: IslenmisMedya[]) => Promise.all(l.map(disa));

  /** Bu çalışmada bozuk bulunup kenara alınan kayıt dosyası; arayüze bir kez bildirilir. */
  let kurtarilanKayit: string | null = null;

  async function kayitAc(): Promise<Katalog> {
    const k = await katalogAc(a.calismaKlasoru);
    if (k.kurtarilan) kurtarilanKayit ??= k.kurtarilan;
    return k;
  }

  async function gruplar(): Promise<Grup[]> {
    return [...HAZIR_GRUPLAR, ...(await kayitAc()).veri.kullaniciGruplari];
  }

  /** Bir kaydı hem katalogda hem bellekteki son sonuçta değiştirir. */
  async function degistir(anahtar: string, f: (m: IslenmisMedya) => void): Promise<ArayuzMedya> {
    const k = await kayitAc();
    const m = k.al(anahtar);
    if (!m) throw new Error('Dosya kayıtta bulunamadı');
    f(m);
    await k.kaydet();
    const bellek = son.find((x) => x.anahtar === anahtar);
    if (bellek) f(bellek);
    return disa(bellek ?? m);
  }

  async function baslat(girdiler: string[]): Promise<{ adet: number; durduruldu: boolean }> {
    const md = await model();
    const durdur = new AbortController();
    durdurucu = durdur;
    let zincir: Promise<void> = Promise.resolve();
    const sirala = (f: () => Promise<void> | void) => {
      zincir = zincir.then(f);
    };
    const sonuc = await ayikla({
      girdiler,
      calismaKlasoru: a.calismaKlasoru,
      gruplar: await gruplar(),
      model: md,
      durdur: durdur.signal,
      olay: (o) => {
        if (o.tur === 'dosya') {
          sirala(async () => olay({ tur: 'dosya', medya: await disa(o.medya), sira: o.sira, toplam: o.toplam }));
        } else if (o.tur !== 'bitti') {
          sirala(() => olay(o));
        }
      },
    });
    await zincir;
    son = sonuc;
    sonGirdiler = girdiler;
    durdurucu = null;
    const durduruldu = durdur.signal.aborted;
    const k = await kayitAc();
    k.arsivEkle({
      girdiler,
      tarih: new Date().toISOString(),
      foto: sonuc.filter((m) => m.tur === 'foto').length,
      video: sonuc.filter((m) => m.tur === 'video').length,
    });
    await k.kaydet();
    olay({ tur: 'bitti', sonuc: await disaListe(sonuc), durduruldu });
    return { adet: sonuc.length, durduruldu };
  }

  /** Girdilerden klasör olanlar: hedef bunların içinde ya da onları içine alan bir yer olamaz. */
  async function kaynakKlasorleri(): Promise<string[]> {
    const liste: string[] = [];
    for (const g of sonGirdiler) {
      try {
        if ((await stat(g)).isDirectory()) liste.push(g);
      } catch {
        // artık olmayan girdi: denetlenecek bir şey yok
      }
    }
    return liste;
  }

  /** Kaydedilecek / arşive alınacak dosyalar: elenmeyenler ve RAW (NEF) eşleri — hiçbir RAW kaybolmaz. */
  function secilenler(): { yol: string; m: IslenmisMedya }[] {
    return son.filter((m) => !m.eleme).flatMap((m) => [m.yol, ...(m.ham ?? [])].map((yol) => ({ yol, m })));
  }

  async function aktar(hedef: string): Promise<AktarmaSonucu> {
    const sorun = hedefSorunu(hedef, await kaynakKlasorleri(), a.calismaKlasoru);
    if (sorun) throw new Error(sorun);
    const gs = await gruplar();
    const ad = (id: string) => gs.find((g) => g.id === id)?.ad ?? (id === DIGER_ID ? 'Diğer' : id);
    // RAW eşleri JPG'nin yanına, aynı klasöre kopyalanır.
    const ogeler = secilenler().map(({ yol, m }) => ({ yol, grupAdi: ad(m.grupId), tarih: m.tarih }));
    return disariAktar(ogeler, hedef, (bitti, toplam) => {
      if (bitti === toplam || bitti % 10 === 0) olay({ tur: 'aktarim', bitti, toplam });
    });
  }

  // ------------------------------------------------------------ arşiv

  const arsivDosyasi = () => join(a.calismaKlasoru, 'arsiv.json');

  async function bilinenArsiv(): Promise<{ kok: string; kimlik: string } | null> {
    try {
      const v = JSON.parse(await readFile(arsivDosyasi(), 'utf8')) as { kok?: unknown; kimlik?: unknown };
      return typeof v.kok === 'string' && typeof v.kimlik === 'string' ? { kok: v.kok, kimlik: v.kimlik } : null;
    } catch {
      return null;
    }
  }

  async function arsivDurumu(): Promise<ArsivDurumuCevabi> {
    const b = await bilinenArsiv();
    if (!b) return { kok: null, ad: null };
    try {
      const k = await arsivKimligiOku(b.kok);
      // Aynı yerde başka bir arşiv varsa (disk değişmiş) bilinen arşiv sayılmaz
      return k.kimlik === b.kimlik ? { kok: b.kok, ad: k.ad } : { kok: null, ad: null };
    } catch {
      return { kok: b.kok, ad: null }; // disk takılı değil: yol hatırlanır, ad okunamaz
    }
  }

  async function arsiveAl(kok: string): Promise<ArsivAlimSonucu> {
    try {
      await arsivKimligiOku(kok);
    } catch (h) {
      if (!(h instanceof ArsivHatasi) || h.kod !== 'arsiv-degil') throw h;
      await arsivOlustur(kok, { kaynaklar: await kaynakKlasorleri(), calismaKlasoru: a.calismaKlasoru });
    }
    const ar = await Arsiv.ac(kok);
    try {
      // Öğe seçimi "Klasöre kaydet" ile aynı: elenmeyenler ve RAW eşleri
      const dosyalar: IceAlinacak[] = secilenler().map(({ yol, m }) => ({ yol, tur: yol === m.yol ? m.tur : undefined, tarih: m.tarih }));
      olay({ tur: 'arsivAlim', bitti: 0, toplam: dosyalar.length, zaten: 0 });
      const r = await iceAl(ar, dosyalar, (bitti, toplam, ara) => {
        if (bitti === toplam || bitti % 10 === 0) olay({ tur: 'arsivAlim', bitti, toplam, zaten: ara.tekil + ara.kayitli });
      });
      return { kok: ar.kok, ad: ar.kimlik.ad, yeni: r.yeni, zaten: r.tekil + r.kayitli, hata: r.hatalar.length, durduruldu: r.durduruldu };
    } finally {
      await ar.kapat();
      await mkdir(a.calismaKlasoru, { recursive: true });
      const gecici = `${arsivDosyasi()}.gecici`;
      await writeFile(gecici, JSON.stringify({ kok: ar.kok, kimlik: ar.kimlik.kimlik }, null, 2));
      await rename(gecici, arsivDosyasi());
    }
  }

  async function modelDurumu(): Promise<ModelDurumuCevabi> {
    const d = await a.modelIzni.durum();
    const paketler = d.eksik.map(({ dosyalar: _d, surum: _s, ozetler: _o, ...p }) => p);
    return { indirmeGerekli: d.indirmeGerekli, paketler, toplamMB: paketler.reduce((t, p) => t + p.boyutMB, 0) };
  }

  async function calistir(i: IsciIstegi): Promise<unknown> {
    switch (i.tur) {
      case 'say': {
        // Kullanıcı "Ayıkla"ya basmadan model ısınsın; ama yalnız indirme onayı gerekmiyorsa
        if (await a.modelIzni.kullanilabilirMi(CLIP_PAKETI)) void model().catch(() => {});
        const { islenecek: d, esler } = hamEsleriniAyir(await tara(i.girdiler, { haric: [a.calismaKlasoru] }));
        const sayim: Sayim = {
          foto: d.filter((x) => x.tur === 'foto').length,
          video: d.filter((x) => x.tur === 'video').length,
          ham: [...esler.values()].reduce((t, l) => t + l.length, 0),
        };
        return sayim;
      }
      case 'baslat':
        return baslat(i.girdiler);
      case 'durdur':
        durdurucu?.abort();
        return true;
      case 'gruplar':
        return gruplar();
      case 'grupEkle': {
        const ad = i.ad.trim();
        if (!ad) throw new Error('Grup adı boş olamaz');
        const g = kullaniciGrubu(ad, await a.cevir(ad, await a.modelIzni.uzaktanIzin(CEVIRI_PAKETI)));
        const k = await kayitAc();
        k.veri.kullaniciGruplari = [...k.veri.kullaniciGruplari.filter((x) => x.id !== g.id), g];
        await k.kaydet();
        await yenidenPuanla(son, await gruplar(), await model());
        return { grup: g, sonuc: await disaListe(son) };
      }
      case 'grupTasi': {
        const grupId = i.grupId;
        return degistir(i.anahtar, (m) => {
          m.elleGrup = grupId;
          m.grupId = grupId;
          if (m.eleme) {
            m.eleme = null;
            m.geriAlindi = true;
          }
        });
      }
      case 'geriAl':
        return degistir(i.anahtar, (m) => {
          m.eleme = null;
          m.geriAlindi = true;
        });
      case 'sonArsivler':
        return (await kayitAc()).veri.sonArsivler ?? [];
      case 'aktar':
        return aktar(i.hedef);
      case 'arsivDurumu':
        return arsivDurumu();
      case 'arsiveAl':
        return arsiveAl(i.kok);
      case 'modelDurumu':
        return modelDurumu();
      case 'modelIzniVer':
        await a.modelIzni.ver();
        return modelDurumu();
      case 'katalogDurumu': {
        await kayitAc();
        const kurtarilan = kurtarilanKayit;
        kurtarilanKayit = null; // bir kez söylenir
        return { kurtarilan } satisfies KatalogDurumuCevabi;
      }
    }
  }

  return {
    async isle(i: IsciIstegi): Promise<void> {
      try {
        a.gonder({ tur: 'cevap', cevap: { id: i.id, tamam: true, veri: await calistir(i) } });
      } catch (h) {
        a.gonder({ tur: 'cevap', cevap: { id: i.id, tamam: false, hata: hataMetni(h) } });
      }
    },
  };
}
