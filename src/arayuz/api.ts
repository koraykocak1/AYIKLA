import type { AyiklaApi } from '../ana/onyukle';
import type { ArsivGorunumu, ArsivIslemi, ArsivSorgusu, YedekDurumu } from '../ortak/mesajlar';
import type { ArayuzMedya, ArayuzOlayi, ArsivAlimSonucu, ArsivDurumuCevabi, KatalogDurumuCevabi, ModelDurumuCevabi, Sayim } from '../ortak/mesajlar';
import type { Grup, SonArsiv } from '../motor/tipler';
import type { AktarmaSonucu } from '../motor/disari-aktar';

declare global {
  interface Window {
    ayikla: AyiklaApi;
  }
}

const k = () => window.ayikla;

/** Arayüzün motorla konuştuğu tek yer: tipli sarmalayıcılar. */
export const api = {
  say: (girdiler: string[]) => k().istek({ tur: 'say', girdiler }) as Promise<Sayim>,
  baslat: (girdiler: string[]) => k().istek({ tur: 'baslat', girdiler }) as Promise<{ adet: number; durduruldu: boolean }>,
  durdur: () => k().istek({ tur: 'durdur' }),
  gruplar: () => k().istek({ tur: 'gruplar' }) as Promise<Grup[]>,
  grupEkle: (ad: string) => k().istek({ tur: 'grupEkle', ad }) as Promise<{ grup: Grup; sonuc: ArayuzMedya[] }>,
  grupTasi: (anahtar: string, grupId: string) => k().istek({ tur: 'grupTasi', anahtar, grupId }) as Promise<ArayuzMedya>,
  geriAl: (anahtar: string) => k().istek({ tur: 'geriAl', anahtar }) as Promise<ArayuzMedya>,
  modelDurumu: () => k().istek({ tur: 'modelDurumu' }) as Promise<ModelDurumuCevabi>,
  modelIzniVer: () => k().istek({ tur: 'modelIzniVer' }) as Promise<ModelDurumuCevabi>,
  katalogDurumu: () => k().istek({ tur: 'katalogDurumu' }) as Promise<KatalogDurumuCevabi>,
  sonArsivler: () => k().istek({ tur: 'sonArsivler' }) as Promise<SonArsiv[]>,
  aktarSec: () => k().aktarSec() as Promise<AktarmaSonucu | null>,
  arsivDurumu: () => k().istek({ tur: 'arsivDurumu' }) as Promise<ArsivDurumuCevabi>,
  arsivSec: () => k().arsivSec(),
  arsiveAl: (kok: string, anahtarlar?: string[]) => k().arsiveAl(kok, anahtarlar) as Promise<ArsivAlimSonucu>,
  arsivAlimDurdur: () => k().istek({ tur: 'arsivAlimDurdur' }),
  arsivGoster: (sorgu: ArsivSorgusu) => k().istek({ tur: 'arsivGoster', sorgu }) as Promise<ArsivGorunumu>,
  arsivIslem: (islem: ArsivIslemi) => k().istek({ tur: 'arsivIslem', islem }),
  bayatKilidiKaldir: () => k().istek({ tur: 'bayatKilidiKaldir' }),
  yedekDurumu: () => k().istek({ tur: 'yedekDurumu' }) as Promise<YedekDurumu>,
  arsivDenetle: () => k().istek({ tur: 'arsivDenetle' }) as Promise<YedekDurumu>,
  yedekSec: () => k().yedekSec() as Promise<YedekDurumu | null>,
  geriYukleSec: () => k().geriYukleSec() as Promise<ArsivDurumuCevabi | null>,
  klasorSec: () => k().klasorSec(),
  baslangicKlasoru: () => k().baslangicKlasoru(),
  yolAl: (f: File) => k().yolAl(f),
  olaylariDinle: (f: (o: ArayuzOlayi) => void) => k().olaylariDinle(f),
};
