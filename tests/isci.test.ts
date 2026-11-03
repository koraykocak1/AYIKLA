import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { ayikla, grupBelirle, yenidenPuanla } from '../src/motor/isci';
import { normalize } from '../src/motor/sahne-puan';
import { KATALOG_ADI, katalogAc } from '../src/motor/katalog';
import type { IsciOlayi, IslenmisMedya, SahneModeli } from '../src/motor/tipler';
import { geciciKlasor, desenliResim, bulanikResim, karanlikResim, ornekVideo, geceResmi, sahteNef, gurultuJpeg } from './yardimci';

function sahteModel() {
  const sayac = { resim: 0 };
  const model: SahneModeli = {
    cihaz: 'sahte',
    async resimVektoru(yol) {
      sayac.resim++;
      const s = await sharp(yol).stats();
      return normalize(s.channels.slice(0, 3).map((c) => c.mean));
    },
    async metinVektorleri(metinler) {
      return metinler.map((m) => (m === 'kirmizi' ? [1, 0, 0] : m === 'mavi' ? [0, 0, 1] : [0, 1, 0]));
    },
  };
  return { model, sayac };
}

const GRUPLAR = [
  { id: 'k', ad: 'Kırmızı', tarifler: ['kirmizi'] },
  { id: 'm', ad: 'Mavi', tarifler: ['mavi'] },
];

describe('isci', () => {
  it('gruplar, eler, kopyaları bulur ve önbelleği kullanır', async () => {
    const kok = await geciciKlasor();
    const girdi = join(kok, 'girdi');
    await mkdir(girdi);
    await desenliResim(join(girdi, 'IMG_20240812_100000.jpg'), { renk: [220, 40, 40], tohum: 1 });
    await desenliResim(join(girdi, 'IMG_20240812_100001.jpg'), { renk: [220, 40, 40], tohum: 1, boyut: 512 });
    await desenliResim(join(girdi, 'IMG_20230105_100000.jpg'), { renk: [40, 40, 220], tohum: 2 });
    await bulanikResim(join(girdi, 'bulanik.jpg'), 3);
    await karanlikResim(join(girdi, 'karanlik.jpg'));
    await ornekVideo(join(girdi, 'video.mp4'), 'red', '2022-05-06T07:08:09Z');
    await writeFile(join(girdi, 'bozuk.jpg'), 'degil');

    const { model, sayac } = sahteModel();
    const olaylar: IsciOlayi[] = [];
    const calisma = join(kok, 'calisma');
    const sonuc = await ayikla({ girdiler: [girdi], calismaKlasoru: calisma, gruplar: GRUPLAR, model, olay: (o) => olaylar.push(o) });

    const bul = (ad: string) => sonuc.find((m) => m.yol.endsWith(ad))!;
    expect(sonuc).toHaveLength(6);
    expect(olaylar[0]).toMatchObject({ tur: 'basladi', toplam: 7 });
    expect(olaylar.some((o) => o.tur === 'okunamadi' && o.yol.endsWith('bozuk.jpg'))).toBe(true);
    expect(olaylar.at(-1)?.tur).toBe('bitti');

    expect(bul('IMG_20230105_100000.jpg').grupId).toBe('m');
    expect(bul('video.mp4').grupId).toBe('k');
    expect(bul('video.mp4').onizlemeler).toHaveLength(3);
    expect(bul('bulanik.jpg').eleme).toBe('bulanik');
    expect(bul('karanlik.jpg').eleme).toBe('karanlik');

    // İki kırmızı kopyadan büyük olan kalır, küçük olan "kopya" olur
    expect(bul('IMG_20240812_100001.jpg').eleme).toBeNull();
    expect(bul('IMG_20240812_100001.jpg').grupId).toBe('k');
    expect(bul('IMG_20240812_100000.jpg').eleme).toBe('kopya');

    // İlk çalıştırmada önbellek boş: yığın için hazır küçük resim yok
    expect(olaylar[0]).toMatchObject({ onizlemeler: [null, null, null, null, null, null, null] });

    // İkinci çalıştırma: hiçbir resim yeniden işlenmez; yığın baştan küçük resimlerle dolar
    const ilk = sayac.resim;
    const olaylar2: IsciOlayi[] = [];
    const sonuc2 = await ayikla({ girdiler: [girdi], calismaKlasoru: calisma, gruplar: GRUPLAR, model, olay: (o) => olaylar2.push(o) });
    const b = olaylar2[0];
    if (b.tur !== 'basladi') throw new Error('basladi bekleniyordu');
    expect(b.onizlemeler).toHaveLength(7);
    expect(b.onizlemeler.filter(Boolean)).toHaveLength(6); // bozuk.jpg önbellekte yok
    expect(sayac.resim).toBe(ilk);
    expect(sonuc2).toHaveLength(6);
  });

  it('elle seçilen grup yapay zekânın önüne geçer', async () => {
    const kok = await geciciKlasor();
    const girdi = join(kok, 'girdi');
    await mkdir(girdi);
    await desenliResim(join(girdi, 'a.jpg'), { renk: [220, 40, 40], tohum: 1 });
    const { model } = sahteModel();
    const calisma = join(kok, 'calisma');
    const ilk = await ayikla({ girdiler: [girdi], calismaKlasoru: calisma, gruplar: GRUPLAR, model, olay: () => {} });
    expect(ilk[0].grupId).toBe('k');

    const d = await katalogAc(calisma);
    Object.values(d.veri.medya)[0].elleGrup = 'm';
    await d.kaydet();

    const ikinci = await ayikla({ girdiler: [girdi], calismaKlasoru: calisma, gruplar: GRUPLAR, model, olay: () => {} });
    expect(ikinci[0].grupId).toBe('m');
  });

  it('kart rengini kaydeder; hiçbir şey değişmediyse kataloğa yeniden yazmaz', async () => {
    const kok = await geciciKlasor();
    await desenliResim(join(kok, 'a.jpg'), { renk: [220, 40, 40], tohum: 1 });
    const { model } = sahteModel();
    const calisma = join(kok, 'calisma');
    const ilk = await ayikla({ girdiler: [join(kok, 'a.jpg')], calismaKlasoru: calisma, gruplar: GRUPLAR, model, olay: () => {} });
    expect(ilk[0].renk).toMatch(/^#[0-9a-f]{6}$/);
    const once = (await stat(join(calisma, KATALOG_ADI))).mtimeMs;
    await new Promise((r) => setTimeout(r, 50));
    await ayikla({ girdiler: [join(kok, 'a.jpg')], calismaKlasoru: calisma, gruplar: GRUPLAR, model, olay: () => {} });
    expect((await stat(join(calisma, KATALOG_ADI))).mtimeMs).toBe(once);
  });

  it('ekran görüntüsü grubu yalnızca dosya adı veya PNG biçimi ekran görüntüsü diyorsa seçilir', () => {
    const gv = [
      { grupId: 'ekran', vektorler: [[1, 0, 0]] },
      { grupId: 'insanlar', vektorler: [normalize([0.8, 0.6, 0])] },
    ];
    const m = (yol: string) => ({ yol, tur: 'foto', vektor: [1, 0, 0] }) as IslenmisMedya;
    expect(grupBelirle(m('C:/a.jpg'), gv)).toBe('insanlar');
    expect(grupBelirle(m('C:/a.PNG'), gv)).toBe('ekran');
    expect(grupBelirle(m('C:/Screenshot_20240101.jpg'), gv)).toBe('ekran');
  });

  it('eski kuralla "karanlık" kaydedilmiş gece fotoğrafı yeniden ölçülür ve artık elenmez', async () => {
    const kok = await geciciKlasor();
    await geceResmi(join(kok, 'gece.jpg'));
    const { model, sayac } = sahteModel();
    const calisma = join(kok, 'calisma');
    await ayikla({ girdiler: [kok + '/gece.jpg'], calismaKlasoru: calisma, gruplar: GRUPLAR, model, olay: () => {} });
    // Eski sürümün kaydını taklit et: aydinlik yok, karanlik = true
    const d = await katalogAc(calisma);
    const m = Object.values(d.veri.medya)[0];
    delete m.kalite.aydinlik;
    m.kalite.karanlik = true;
    await d.kaydet();
    const once = sayac.resim;

    const sonuc = await ayikla({ girdiler: [kok + '/gece.jpg'], calismaKlasoru: calisma, gruplar: GRUPLAR, model, olay: () => {} });
    expect(sonuc[0].eleme).toBeNull();
    expect(sonuc[0].kalite.aydinlik).toBeGreaterThanOrEqual(60);
    expect(sayac.resim).toBe(once); // yapay zekâ yeniden çalışmadı
  });

  it('NEF: JPG eşi olan bağlanır ve işlenmez, eşi olmayan fotoğraf olarak işlenir', async () => {
    const kok = await geciciKlasor();
    await desenliResim(join(kok, '_DSC1.JPG'), { renk: [220, 40, 40], tohum: 1 });
    await sahteNef(join(kok, '_DSC1.NEF'), { jpegler: [await gurultuJpeg(800, 600, 1)] });
    await sahteNef(join(kok, '_DSC2.NEF'), { jpegler: [await gurultuJpeg(800, 600, 2)], genislik: 6000, yukseklik: 4000 });
    const { model } = sahteModel();
    const olaylar: IsciOlayi[] = [];
    const sonuc = await ayikla({ girdiler: [kok], calismaKlasoru: join(kok, 'calisma'), gruplar: GRUPLAR, model, olay: (o) => olaylar.push(o) });
    expect(olaylar[0]).toMatchObject({ tur: 'basladi', toplam: 2 });
    expect(sonuc.map((m) => m.yol.slice(-9))).toEqual(['_DSC1.JPG', '_DSC2.NEF']);
    expect(sonuc[0].ham).toEqual([join(kok, '_DSC1.NEF')]);
    expect(sonuc[1]).toMatchObject({ genislik: 6000, yukseklik: 4000 });
    expect(sonuc[1].onizlemeler).toHaveLength(1);
  });

  it('başka klasördeki görsel kopyası olan NEF: JPG görünür kalır, NEF kopya sayılır ve JPG’ye RAW eşi olarak bağlanır', async () => {
    const kok = await geciciKlasor();
    await mkdir(join(kok, 'a'));
    await mkdir(join(kok, 'b'));
    const jpg = join(kok, 'a', '_DSC1.JPG');
    await desenliResim(jpg, { renk: [220, 40, 40], tohum: 1, boyut: 512 });
    const nef = join(kok, 'b', '_DSC1.NEF'); // farklı klasör: adla eşleşmez, görsel olarak kopya
    await sahteNef(nef, { jpegler: [await readFile(jpg)], genislik: 8000, yukseklik: 8000 });
    const { model } = sahteModel();
    const sonuc = await ayikla({ girdiler: [kok], calismaKlasoru: join(kok, 'calisma'), gruplar: GRUPLAR, model, olay: () => {} });
    const j = sonuc.find((m) => m.yol === jpg)!;
    const n = sonuc.find((m) => m.yol === nef)!;
    expect(j.eleme).toBeNull();
    expect(n.eleme).toBe('kopya');
    expect(j.ham).toEqual([nef]);
  });

  it('geri alınan dosya elenmez', async () => {
    const kok = await geciciKlasor();
    const girdi = join(kok, 'girdi');
    await mkdir(girdi);
    await bulanikResim(join(girdi, 'bulanik.jpg'), 3);
    const { model } = sahteModel();
    const calisma = join(kok, 'calisma');
    const ilk = await ayikla({ girdiler: [girdi], calismaKlasoru: calisma, gruplar: GRUPLAR, model, olay: () => {} });
    expect(ilk[0].eleme).toBe('bulanik');

    const d = await katalogAc(calisma);
    Object.values(d.veri.medya)[0].geriAlindi = true;
    await d.kaydet();

    const ikinci = await ayikla({ girdiler: [girdi], calismaKlasoru: calisma, gruplar: GRUPLAR, model, olay: () => {} });
    expect(ikinci[0].eleme).toBeNull();
  });

  it('yenidenPuanla yeni grup listesine göre dağıtır, resimleri yeniden işlemez', async () => {
    const kok = await geciciKlasor();
    await desenliResim(join(kok, 'a.jpg'), { renk: [40, 40, 220], tohum: 2 });
    const { model, sayac } = sahteModel();
    const sonuc = await ayikla({ girdiler: [join(kok, 'a.jpg')], calismaKlasoru: join(kok, 'calisma'), gruplar: [GRUPLAR[0]], model, olay: () => {} });
    expect(sonuc[0].grupId).toBe('diger'); // yalnızca "Kırmızı" varken mavi resim Diğer'e düşer
    const once = sayac.resim;
    await yenidenPuanla(sonuc, GRUPLAR, model);
    expect(sonuc[0].grupId).toBe('m');
    expect(sayac.resim).toBe(once);
  });

  it('durdurulunca hiçbir dosyayı işlemez', async () => {
    const kok = await geciciKlasor();
    await desenliResim(join(kok, 'a.jpg'), { renk: [220, 40, 40], tohum: 1 });
    const { model, sayac } = sahteModel();
    const durdur = new AbortController();
    durdur.abort();
    const sonuc = await ayikla({
      girdiler: [kok], calismaKlasoru: join(kok, 'calisma'), gruplar: GRUPLAR, model, olay: () => {}, durdur: durdur.signal,
    });
    expect(sonuc).toHaveLength(0);
    expect(sayac.resim).toBe(0);
  });
});
