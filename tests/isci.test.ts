import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { ayikla } from '../src/motor/isci';
import { normalize } from '../src/motor/sahne-puan';
import { KayitDeposu } from '../src/motor/kayit';
import type { IsciOlayi, SahneModeli } from '../src/motor/tipler';
import { geciciKlasor, desenliResim, bulanikResim, karanlikResim, ornekVideo } from './yardimci';

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
    expect(olaylar[0]).toEqual({ tur: 'basladi', toplam: 7 });
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

    // İkinci çalıştırma: hiçbir resim yeniden işlenmez
    const ilk = sayac.resim;
    const sonuc2 = await ayikla({ girdiler: [girdi], calismaKlasoru: calisma, gruplar: GRUPLAR, model, olay: () => {} });
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

    const d = new KayitDeposu(join(calisma, 'kayit.json'));
    await d.yukle();
    Object.values(d.veri.medya)[0].elleGrup = 'm';
    await d.kaydet();

    const ikinci = await ayikla({ girdiler: [girdi], calismaKlasoru: calisma, gruplar: GRUPLAR, model, olay: () => {} });
    expect(ikinci[0].grupId).toBe('m');
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
