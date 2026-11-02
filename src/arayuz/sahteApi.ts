import type { AyiklaApi } from '../ana/onyukle';
import type { Istek } from '../ortak/mesajlar';
import type { Grup, SonArsiv } from '../motor/tipler';

/**
 * Yalnızca geliştirmede: arayüz Electron dışında, tarayıcıda açıldığında motorun yerine geçer.
 * Böylece tasarım yan panelde canlı görülebilir. Hiçbir gerçek dosyaya dokunmaz; programa paketlenmez.
 */
const gruplar: Grup[] = [
  { id: 'insanlar', ad: 'İnsanlar', tarifler: [] },
  { id: 'hayvanlar', ad: 'Hayvanlar', tarifler: [] },
  { id: 'yemek', ad: 'Yemek', tarifler: [] },
  { id: 'doga', ad: 'Doğa', tarifler: [] },
];

const sonArsivler: SonArsiv[] = [{ girdiler: ['C:\\Örnek\\Telefon'], tarih: new Date().toISOString(), foto: 1240, video: 86 }];

export const sahteApi: AyiklaApi = {
  istek: async (i: Istek) => {
    switch (i.tur) {
      case 'gruplar':
        return gruplar;
      case 'sonArsivler':
        return sonArsivler;
      case 'say':
        return { foto: 1240, video: 86, ham: 0 };
      default:
        return null;
    }
  },
  klasorSec: async () => 'C:\\Örnek\\Telefon',
  aktarSec: async () => null,
  baslangicKlasoru: async () => null,
  yolAl: (f: File) => f.name,
  olaylariDinle: () => () => {},
};
