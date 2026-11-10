import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { sunucuOlustur } from '../src/motor/sunucu';
import { normalize } from '../src/motor/sahne-puan';
import { katalogAc } from '../src/motor/katalog';
import type { ArsivGorunumu, ArsivIslemi, ArsivSorgusu, YedekDurumu } from '../src/ortak/mesajlar';
import type { ArayuzMedya, ArayuzOlayi, ArsivAlimSonucu, ArsivDurumuCevabi, IsciIstegi, IsciMesaji, Istek, KatalogDurumuCevabi, Sayim } from '../src/ortak/mesajlar';
import type { Grup, SahneModeli } from '../src/motor/tipler';
import type { AktarmaSonucu } from '../src/motor/disari-aktar';
import { geciciKlasor, klasorGoruntusu, medyaDosyalari, inmisModelIzni, desenliResim, bulanikResim, ornekVideo, sahteNef, gurultuJpeg } from './yardimci';

// Sahte model: resmin ortalama rengi vektör olur; ana konusu "blue" olan tarifler maviye, diğer her tarif yeşile denk gelir.
const sahteModel: SahneModeli = {
  cihaz: 'sahte',
  async resimVektoru(yol) {
    const s = await sharp(yol).stats();
    return normalize(s.channels.slice(0, 3).map((c) => c.mean));
  },
  async metinVektorleri(metinler) {
    return metinler.map((m) => (m.includes('a blue') && !/front|background/.test(m) ? [0, 0, 1] : [0, 1, 0]));
  },
};

async function hazirla(modelYukle: () => Promise<SahneModeli> = async () => sahteModel) {
  const kok = await geciciKlasor();
  const girdi = join(kok, 'girdi');
  await mkdir(girdi);
  await desenliResim(join(girdi, 'mavi.jpg'), { renk: [40, 40, 220], tohum: 2 });
  await bulanikResim(join(girdi, 'bulanik.jpg'), 3);
  await ornekVideo(join(girdi, 'video.mp4'), 'red');
  const calisma = join(kok, 'calisma');
  const mesajlar: IsciMesaji[] = [];
  const sunucu = sunucuOlustur({
    calismaKlasoru: calisma,
    modelYukle,
    cevir: async () => 'blue',
    modelIzni: await inmisModelIzni(calisma),
    gonder: (m) => mesajlar.push(m),
  });
  let sira = 0;
  async function iste<T>(i: Istek): Promise<T> {
    const id = ++sira;
    await sunucu.isle({ ...i, id } as IsciIstegi);
    const m = mesajlar.find((x) => x.tur === 'cevap' && x.cevap.id === id);
    if (!m || m.tur !== 'cevap') throw new Error('cevap yok');
    if (!m.cevap.tamam) throw new Error(m.cevap.hata);
    return m.cevap.veri as T;
  }
  const olaylar = (): ArayuzOlayi[] => mesajlar.flatMap((m) => (m.tur === 'olay' ? [m.olay] : []));
  return { kok, girdi, calisma, iste, olaylar };
}

describe('sunucu', () => {
  it('klasördeki fotoğraf ve videoları sayar', async () => {
    const s = await hazirla();
    expect(await s.iste<Sayim>({ tur: 'say', girdiler: [s.girdi] })).toEqual({ foto: 2, video: 1, ham: 0 });
  });

  it('bozuk kayıt dosyası kenara alındıysa arayüze bir kez söyler', async () => {
    const temiz = await hazirla();
    expect(await temiz.iste<KatalogDurumuCevabi>({ tur: 'katalogDurumu' })).toEqual({ kurtarilan: null });

    const s = await hazirla();
    await writeFile(join(s.calisma, 'katalog.db'), 'bu bir veritabanı değil'.repeat(100));
    const ilk = await s.iste<KatalogDurumuCevabi>({ tur: 'katalogDurumu' });
    expect(ilk.kurtarilan).toMatch(/katalog\.db\.bozuk-/);
    expect(await s.iste<KatalogDurumuCevabi>({ tur: 'katalogDurumu' })).toEqual({ kurtarilan: null });
  });

  it('ayıklarken olayları sırayla yollar, son arşivi kaydeder', async () => {
    const s = await hazirla();
    await s.iste({ tur: 'baslat', girdiler: [s.girdi] });
    const o = s.olaylar();
    expect(o[0]).toEqual({ tur: 'model', durum: 'yukleniyor' });
    expect(o[1]).toEqual({ tur: 'model', durum: 'hazir', cihaz: 'sahte' });
    expect(o[2]).toMatchObject({ tur: 'basladi', toplam: 3 });
    const dosyalar = o.filter((x) => x.tur === 'dosya');
    expect(dosyalar).toHaveLength(3);
    for (const d of dosyalar) {
      expect(d.medya.renk).toMatch(/^#[0-9a-f]{6}$/);
      expect('vektor' in d.medya).toBe(false);
    }
    const bitti = o.at(-1);
    expect(bitti?.tur).toBe('bitti');
    if (bitti?.tur === 'bitti') {
      expect(bitti.sonuc).toHaveLength(3);
      expect(bitti.durduruldu).toBe(false);
    }
    const arsivler = await s.iste<{ girdiler: string[]; foto: number; video: number }[]>({ tur: 'sonArsivler' });
    expect(arsivler).toEqual([expect.objectContaining({ girdiler: [s.girdi], foto: 2, video: 1 })]);
  });

  it('yeni grup ekleyince Türkçe adı çevirir ve arşivi yeniden puanlar', async () => {
    const s = await hazirla();
    await s.iste({ tur: 'baslat', girdiler: [s.girdi] });
    const r = await s.iste<{ grup: Grup; sonuc: ArayuzMedya[] }>({ tur: 'grupEkle', ad: 'Mavi' });
    expect(r.grup).toMatchObject({ id: 'k-mavi', ad: 'Mavi', ingilizce: 'blue', kullanici: true });
    expect(r.sonuc.find((m) => m.yol.endsWith('mavi.jpg'))?.grupId).toBe('k-mavi');
    const gruplar = await s.iste<Grup[]>({ tur: 'gruplar' });
    expect(gruplar.at(-1)?.id).toBe('k-mavi');
  });

  it('elle taşıma ve geri alma kalıcıdır', async () => {
    const s = await hazirla();
    await s.iste({ tur: 'baslat', girdiler: [s.girdi] });
    const bitti = s.olaylar().at(-1);
    if (bitti?.tur !== 'bitti') throw new Error('bitmedi');
    const bulanik = bitti.sonuc.find((m) => m.yol.endsWith('bulanik.jpg'))!;
    const mavi = bitti.sonuc.find((m) => m.yol.endsWith('mavi.jpg'))!;
    expect(bulanik.eleme).toBeNull(); // bulanık kareler artık elenmez

    const tasinan = await s.iste<ArayuzMedya>({ tur: 'grupTasi', anahtar: bulanik.anahtar, grupId: 'deniz' });
    expect(tasinan).toMatchObject({ grupId: 'deniz', elleGrup: 'deniz', eleme: null });
    const geri = await s.iste<ArayuzMedya>({ tur: 'geriAl', anahtar: mavi.anahtar });
    expect(geri.geriAlindi).toBe(true);

    const d = await katalogAc(s.calisma);
    expect(d.al(bulanik.anahtar)).toMatchObject({ elleGrup: 'deniz' });
    expect(d.al(mavi.anahtar)?.geriAlindi).toBe(true);
  });

  it('elenmeyenleri hedef klasöre kopyalar ve ilerleme yollar', async () => {
    const s = await hazirla();
    await s.iste({ tur: 'baslat', girdiler: [s.girdi] });
    const hedef = join(s.kok, 'hedef');
    const r = await s.iste<AktarmaSonucu>({ tur: 'aktar', hedef });
    expect(r).toEqual({ kopyalanan: 3, atlanan: 0, hatalar: [] });
    expect(await readdir(hedef)).toContain('.ayikla-arsiv'); // işaret + grup klasörleri
    expect(s.olaylar().filter((o) => o.tur === 'aktarim').at(-1)).toEqual({ tur: 'aktarim', bitti: 3, toplam: 3 });
  });

  it('kayıt klasörü kaynağın içindeyse ya da çalışma klasörüyse reddeder ve hiçbir şey yazmaz', async () => {
    const s = await hazirla();
    await s.iste({ tur: 'baslat', girdiler: [s.girdi] });
    const once = await readdir(s.girdi);
    await expect(s.iste({ tur: 'aktar', hedef: join(s.girdi, 'Ayiklanmis') })).rejects.toThrow(/içinde olamaz/);
    await expect(s.iste({ tur: 'aktar', hedef: s.kok })).rejects.toThrow(/içine alamaz/);
    await expect(s.iste({ tur: 'aktar', hedef: join(s.calisma, 'x') })).rejects.toThrow(/çalışma klasörü/);
    expect(await readdir(s.girdi)).toEqual(once);
  });

  it('RAW eşini sayar; klasörlere kaydederken JPG’nin yanına NEF’i de kopyalar', async () => {
    const s = await hazirla();
    await sahteNef(join(s.girdi, 'mavi.NEF'), { jpegler: [await gurultuJpeg(800, 600)] });
    expect(await s.iste<Sayim>({ tur: 'say', girdiler: [s.girdi] })).toEqual({ foto: 2, video: 1, ham: 1 });
    await s.iste({ tur: 'baslat', girdiler: [s.girdi] });
    const bitti = s.olaylar().at(-1);
    if (bitti?.tur !== 'bitti') throw new Error('bitmedi');
    expect(bitti.sonuc).toHaveLength(3);
    expect(bitti.sonuc.find((m) => m.yol.endsWith('mavi.jpg'))?.ham).toEqual([join(s.girdi, 'mavi.NEF')]);
    const hedef = join(s.kok, 'hedef');
    const r = await s.iste<AktarmaSonucu>({ tur: 'aktar', hedef });
    expect(r.kopyalanan).toBe(4); // mavi.jpg + mavi.NEF + video + bulanık (artık elenmez)
    const [grup] = (await readdir(hedef)).filter((a) => !a.startsWith('.'));
    const ay = await readdir(join(hedef, grup));
    const dosyalar = (await Promise.all(ay.map(async (y) => Promise.all((await readdir(join(hedef, grup, y))).map((a) => readdir(join(hedef, grup, y, a)))))))
      .flat(2);
    expect(dosyalar).toEqual(expect.arrayContaining(['mavi.jpg', 'mavi.NEF']));
  });

  it('arşive alır: kaynağa dokunmaz, ikinci alımda yeni kopya yapmaz, arşivi hatırlar', async () => {
    const s = await hazirla();
    expect(await s.iste<ArsivDurumuCevabi>({ tur: 'arsivDurumu' })).toEqual({ kok: null, ad: null });
    await s.iste({ tur: 'baslat', girdiler: [s.girdi] });
    const once = await klasorGoruntusu(s.girdi);
    const kok = join(s.kok, 'Arsivim');

    const r = await s.iste<ArsivAlimSonucu>({ tur: 'arsiveAl', kok });
    expect(r).toMatchObject({ ad: 'Arsivim', yeni: 3, zaten: 0, hata: 0, durduruldu: false });
    expect(await medyaDosyalari(kok)).toHaveLength(3);
    expect(s.olaylar().filter((o) => o.tur === 'arsivAlim').at(-1)).toEqual({ tur: 'arsivAlim', bitti: 3, toplam: 3, zaten: 0 });
    expect(await s.iste<ArsivDurumuCevabi>({ tur: 'arsivDurumu' })).toEqual({ kok: r.kok, ad: 'Arsivim' });

    const ikinci = await s.iste<ArsivAlimSonucu>({ tur: 'arsiveAl', kok });
    expect(ikinci).toMatchObject({ yeni: 0, zaten: 3, hata: 0 });
    expect(await medyaDosyalari(kok)).toHaveLength(3);
    expect(await klasorGoruntusu(s.girdi)).toEqual(once);
  });

  it('açık grubu klasöre alt klasörsüz kaydeder: klasörde yalnız fotoğraflar görünür', async () => {
    const s = await hazirla();
    await s.iste({ tur: 'baslat', girdiler: [s.girdi] });
    const bitti = s.olaylar().at(-1);
    if (bitti?.tur !== 'bitti') throw new Error('bitmedi');
    const mavi = bitti.sonuc.find((m) => m.yol.endsWith('mavi.jpg'))!;
    const hedef = join(s.kok, 'Hayvanlar');
    const r = await s.iste<AktarmaSonucu>({ tur: 'aktar', hedef, anahtarlar: [mavi.anahtar] });
    expect(r).toEqual({ kopyalanan: 1, atlanan: 0, hatalar: [] });
    expect((await readdir(hedef)).sort()).toEqual(['.ayikla-arsiv', 'mavi.jpg']); // işaret Windows'ta gizli
    const ikinci = await s.iste<AktarmaSonucu>({ tur: 'aktar', hedef, anahtarlar: [mavi.anahtar] });
    expect(ikinci).toEqual({ kopyalanan: 0, atlanan: 1, hatalar: [] });
  });

  it('yalnız istenen grubu arşive alır; durdurulunca kalanlara dokunmaz', async () => {
    const s = await hazirla();
    await s.iste({ tur: 'baslat', girdiler: [s.girdi] });
    const bitti = s.olaylar().at(-1);
    if (bitti?.tur !== 'bitti') throw new Error('bitmedi');
    const mavi = bitti.sonuc.find((m) => m.yol.endsWith('mavi.jpg'))!;
    const kok = join(s.kok, 'Arsivim');
    const r = await s.iste<ArsivAlimSonucu>({ tur: 'arsiveAl', kok, anahtarlar: [mavi.anahtar] });
    expect(r).toMatchObject({ yeni: 1, zaten: 0, durduruldu: false });
    expect(await medyaDosyalari(kok)).toHaveLength(1);

    // Durdur, alım başlar başlamaz: hiçbir yeni dosya alınmaz
    const alim = s.iste<ArsivAlimSonucu>({ tur: 'arsiveAl', kok });
    await s.iste({ tur: 'arsivAlimDurdur' });
    expect(await alim).toMatchObject({ yeni: 0, durduruldu: true });
    expect(await medyaDosyalari(kok)).toHaveLength(1);
  });

  it('Arşivim: albüm, etiket, arama, kutu, geri al ve kalıcı sil', async () => {
    const s = await hazirla();
    await s.iste({ tur: 'baslat', girdiler: [s.girdi] });
    const once = await klasorGoruntusu(s.girdi);
    const kok = join(s.kok, 'Arsivim');
    await s.iste({ tur: 'arsiveAl', kok });
    const goster = (sorgu: ArsivSorgusu = {}) => s.iste<ArsivGorunumu>({ tur: 'arsivGoster', sorgu });
    const islem = <T,>(i: ArsivIslemi) => s.iste<T>({ tur: 'arsivIslem', islem: i });

    const g = await goster();
    expect(g).toMatchObject({ ad: 'Arsivim', albumler: [], etiketler: [], kutuAdet: 0 });
    expect(g.ogeler).toHaveLength(3);
    const [ilk, ikinci] = g.ogeler;

    const albumId = await islem<number>({ islem: 'albumOlustur', ad: 'Tatil' });
    await islem({ islem: 'albumeEkle', albumId, idler: [ilk.id] });
    await islem({ islem: 'etiketle', idler: [ilk.id], yol: 'Yer › Deniz' });
    const g2 = await goster();
    expect(g2.albumler).toEqual([{ id: albumId, ad: 'Tatil', adet: 1 }]);
    expect(g2.etiketler).toEqual(['Yer', 'Yer > Deniz']);
    expect((await goster({ albumId })).ogeler.map((o) => o.id)).toEqual([ilk.id]);
    expect((await goster({ etiket: 'Yer' })).ogeler.map((o) => o.id)).toEqual([ilk.id]);
    expect((await goster({ metin: ilk.ad.replace(/\..*$/, '') })).ogeler.map((o) => o.id)).toContain(ilk.id);
    await islem({ islem: 'albumdenKaldir', albumId, idler: [ilk.id] });
    expect((await goster({ albumId })).ogeler).toEqual([]);

    await islem({ islem: 'kutuyaTasi', idler: [ilk.id, ikinci.id] });
    const k = await goster({ kutu: true });
    expect(k.kutuAdet).toBe(2);
    expect(k.ogeler[0].kaliciSilinme).toMatch(/^\d{4}-/);
    expect((await goster()).ogeler).toHaveLength(1); // kutuya taşınmayan üçüncü fotoğraf
    await islem({ islem: 'kutudanGeriAl', idler: [ilk.id] });
    await islem({ islem: 'kaliciSil', idler: [ikinci.id] });
    const kalan = (await goster()).ogeler.map((o) => o.id);
    expect(kalan).toContain(ilk.id);
    expect(kalan).not.toContain(ikinci.id);
    expect(kalan).toHaveLength(2);
    expect((await goster({ kutu: true })).kutuAdet).toBe(0);
    expect(await medyaDosyalari(kok)).toHaveLength(2);
    expect(await klasorGoruntusu(s.girdi)).toEqual(once); // kalıcı sil kaynağa dokunmaz
  });

  it('yedek alır ve doğrular, arşivi denetler, yedekten geri yükleyince yeni arşivi hatırlar', async () => {
    const s = await hazirla();
    await s.iste({ tur: 'baslat', girdiler: [s.girdi] });
    await s.iste({ tur: 'arsiveAl', kok: join(s.kok, 'Arsivim') });
    expect(await s.iste<YedekDurumu>({ tur: 'yedekDurumu' })).toEqual({ yedek: null, saglik: null });

    const yedek = join(s.kok, 'Yedek');
    const d = await s.iste<YedekDurumu>({ tur: 'yedekAl', hedef: yedek });
    expect(d.yedek).toMatchObject({ yol: yedek, dogrulandi: true });
    expect(s.olaylar().filter((o) => o.tur === 'arsivIs').at(-1)).toMatchObject({ ad: 'yedek', bitti: 3, toplam: 3 });

    const d2 = await s.iste<YedekDurumu>({ tur: 'arsivDenetle' });
    expect(d2.saglik).toMatchObject({ denetlenen: 3, saglam: 3, sorun: 0 });
    expect(d2.yedek).toEqual(d.yedek); // ikinci arşive alım/denetim yedeği unutturmaz

    const yeni = join(s.kok, 'Geri');
    const r = await s.iste<ArsivDurumuCevabi>({ tur: 'geriYukle', yedek, kok: yeni });
    expect(r).toEqual({ kok: yeni, ad: 'Arsivim' });
    expect(await s.iste<ArsivDurumuCevabi>({ tur: 'arsivDurumu' })).toEqual(r);
    expect((await s.iste<ArsivGorunumu>({ tur: 'arsivGoster', sorgu: {} })).ogeler).toHaveLength(3);
  });

  it('arşiv kaynak klasörün içindeyse ya da klasör boş değilse Türkçe hata verir', async () => {
    const s = await hazirla();
    await s.iste({ tur: 'baslat', girdiler: [s.girdi] });
    await expect(s.iste({ tur: 'arsiveAl', kok: join(s.girdi, 'Arsiv') })).rejects.toThrow(/Arşiv klasörü.*içinde olamaz/);
    const dolu = join(s.kok, 'dolu');
    await mkdir(dolu);
    await writeFile(join(dolu, 'not.txt'), 'x');
    await expect(s.iste({ tur: 'arsiveAl', kok: dolu })).rejects.toThrow(/boş bir klasör seç/);
    expect(await s.iste<ArsivDurumuCevabi>({ tur: 'arsivDurumu' })).toEqual({ kok: null, ad: null });
  });

  it('model yüklenemezse hata bildirir, sonraki denemede yeniden yükler', async () => {
    let deneme = 0;
    const s = await hazirla(async () => {
      deneme++;
      if (deneme === 1) throw new Error('internet yok');
      return sahteModel;
    });
    await expect(s.iste({ tur: 'baslat', girdiler: [s.girdi] })).rejects.toThrow('internet yok');
    expect(s.olaylar()).toContainEqual({ tur: 'model', durum: 'hata', hata: 'internet yok' });
    await s.iste({ tur: 'baslat', girdiler: [s.girdi] });
    expect(deneme).toBe(2);
    expect(s.olaylar().at(-1)?.tur).toBe('bitti');
  });
});
