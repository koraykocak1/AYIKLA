import { describe, it, expect } from 'vitest';
import { join, relative } from 'node:path';
import { mkdir, readdir, stat } from 'node:fs/promises';
import sharp from 'sharp';
import { sunucuOlustur } from '../src/motor/sunucu';
import { normalize } from '../src/motor/sahne-puan';
import { dosyaOzeti } from '../src/motor/disari-aktar';
import type { IsciIstegi, IsciMesaji, Istek, ArayuzMedya } from '../src/ortak/mesajlar';
import type { SahneModeli } from '../src/motor/tipler';
import { geciciKlasor, desenliResim, bulanikResim, ornekVideo, sahteNef, gurultuJpeg } from './yardimci';

const sahteModel: SahneModeli = {
  cihaz: 'sahte',
  async resimVektoru(yol) {
    const s = await sharp(yol).stats();
    return normalize(s.channels.slice(0, 3).map((c) => c.mean));
  },
  async metinVektorleri(metinler) {
    return metinler.map((m) => (m.includes('a blue') ? [0, 0, 1] : [0, 1, 0]));
  },
};

/** Klasördeki her dosyanın göreli yolu → içerik özeti, boyut ve değişme zamanı. */
async function anlikGoruntu(kok: string): Promise<Record<string, string>> {
  const sonuc: Record<string, string> = {};
  async function gez(yol: string) {
    for (const ad of await readdir(yol)) {
      const tam = join(yol, ad);
      const s = await stat(tam);
      if (s.isDirectory()) await gez(tam);
      else sonuc[relative(kok, tam)] = `${await dosyaOzeti(tam)}|${s.size}|${s.mtimeMs}`;
    }
  }
  await gez(kok);
  return sonuc;
}

describe('kaynak dosyalar korunur (değiştirilemez kural 1)', () => {
  it('tarama, ayıklama, elle düzeltme ve dışa aktarma sonunda kaynak klasör birebir aynıdır', async () => {
    const kok = await geciciKlasor();
    const girdi = join(kok, 'Fotolar');
    await mkdir(join(girdi, 'alt'), { recursive: true });
    await desenliResim(join(girdi, 'IMG_20240812_100000.jpg'), { renk: [40, 40, 220], tohum: 1 });
    await desenliResim(join(girdi, 'alt', 'IMG_20240812_100001.jpg'), { renk: [40, 40, 220], tohum: 1, boyut: 512 }); // görsel kopya
    await bulanikResim(join(girdi, 'bulanik.jpg'), 3);
    await ornekVideo(join(girdi, 'video.mp4'), 'red');
    await sahteNef(join(girdi, 'IMG_20240812_100000.NEF'), { jpegler: [await gurultuJpeg(800, 600)] });
    const once = await anlikGoruntu(girdi);

    const mesajlar: IsciMesaji[] = [];
    const s = sunucuOlustur({
      calismaKlasoru: join(kok, 'calisma'),
      modelYukle: async () => sahteModel,
      cevir: async () => 'blue',
      gonder: (m) => mesajlar.push(m),
    });
    let sira = 0;
    const iste = async <T>(i: Istek): Promise<T> => {
      const id = ++sira;
      await s.isle({ ...i, id } as IsciIstegi);
      const m = mesajlar.find((x) => x.tur === 'cevap' && x.cevap.id === id);
      if (!m || m.tur !== 'cevap') throw new Error('cevap yok');
      if (!m.cevap.tamam) throw new Error(m.cevap.hata);
      return m.cevap.veri as T;
    };

    await iste({ tur: 'say', girdiler: [girdi] });
    await iste({ tur: 'baslat', girdiler: [girdi] });
    const bitti = mesajlar.flatMap((m) => (m.tur === 'olay' && m.olay.tur === 'bitti' ? [m.olay.sonuc] : [])).at(-1) as ArayuzMedya[];
    const bulanik = bitti.find((m) => m.yol.endsWith('bulanik.jpg'))!;
    await iste({ tur: 'geriAl', anahtar: bulanik.anahtar });
    await iste({ tur: 'grupEkle', ad: 'Mavi' });
    await iste({ tur: 'grupTasi', anahtar: bitti[0].anahtar, grupId: 'deniz' });
    await iste({ tur: 'aktar', hedef: join(kok, 'Ayiklanmis') });
    await iste({ tur: 'aktar', hedef: join(kok, 'Ayiklanmis') }); // ikinci kez: hiçbir şey ezilmez
    await expect(iste({ tur: 'aktar', hedef: join(girdi, 'icerde') })).rejects.toThrow(); // reddedilir

    expect(await anlikGoruntu(girdi)).toEqual(once);
  });
});
