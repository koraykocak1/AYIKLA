import type { IslenmisMedya } from '../motor/tipler';
import type { ModelPaketi } from '../motor/model-izni';

/** Arayüze giden medya: büyük CLIP vektörü çıkarılır, kartın rengi eklenir. */
export type ArayuzMedya = Omit<IslenmisMedya, 'vektor'> & { renk: string };

export interface Sayim {
  foto: number;
  video: number;
  ham: number; // JPG'sine bağlanan RAW (NEF) eşleri
}

/** Ana süreç → işçi */
export type IsciIstegi =
  | { id: number; tur: 'say'; girdiler: string[] }
  | { id: number; tur: 'baslat'; girdiler: string[] }
  | { id: number; tur: 'durdur' }
  | { id: number; tur: 'gruplar' }
  | { id: number; tur: 'grupEkle'; ad: string }
  | { id: number; tur: 'grupTasi'; anahtar: string; grupId: string }
  | { id: number; tur: 'geriAl'; anahtar: string }
  | { id: number; tur: 'sonArsivler' }
  | { id: number; tur: 'aktar'; hedef: string }
  | { id: number; tur: 'modelDurumu' }
  | { id: number; tur: 'modelIzniVer' };

/** Onay adımı için: indirilecek modeller ve bilgileri (dosya listesi, sürüm ve özetler arayüze gitmez). */
export type ArayuzModelPaketi = Omit<ModelPaketi, 'dosyalar' | 'surum' | 'ozetler'>;
export interface ModelDurumuCevabi {
  indirmeGerekli: boolean;
  paketler: ArayuzModelPaketi[]; // yalnız diskte eksik olanlar
  toplamMB: number;
}

type IdsizIstek<T> = T extends unknown ? Omit<T, 'id'> : never;
/** Kimliği ana süreç ekler; arayüz kimliksiz gönderir. */
export type Istek = IdsizIstek<IsciIstegi>;

/** İşçi → ana süreç → arayüz: canlı olaylar */
export type ArayuzOlayi =
  | { tur: 'model'; durum: 'izinGerekli' | 'yukleniyor' | 'hazir' | 'hata'; cihaz?: string; hata?: string }
  | { tur: 'basladi'; toplam: number; onizlemeler: (string | null)[] }
  | { tur: 'dosya'; medya: ArayuzMedya; sira: number; toplam: number }
  | { tur: 'okunamadi'; yol: string; hata: string }
  | { tur: 'kopyalar'; anahtarlar: string[] }
  | { tur: 'bitti'; sonuc: ArayuzMedya[]; durduruldu: boolean }
  | { tur: 'aktarim'; bitti: number; toplam: number };

export type IsciCevabi = { id: number; tamam: true; veri: unknown } | { id: number; tamam: false; hata: string };

/** İşçinin ana sürece yolladığı her şey */
export type IsciMesaji = { tur: 'cevap'; cevap: IsciCevabi } | { tur: 'olay'; olay: ArayuzOlayi };

export function arayuzIcin(m: IslenmisMedya, renk: string): ArayuzMedya {
  const { vektor: _vektor, ...geri } = m;
  return { ...geri, renk };
}
