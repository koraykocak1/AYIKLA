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
  | { id: number; tur: 'modelIzniVer' }
  | { id: number; tur: 'katalogDurumu' }
  | { id: number; tur: 'arsivDurumu' }
  /** `anahtarlar`: yalnız bu medyalar (Sonuç ekranında açık grup); verilmezse elenmeyenlerin hepsi. */
  | { id: number; tur: 'arsiveAl'; kok: string; anahtarlar?: string[] }
  | { id: number; tur: 'arsivAlimDurdur' }
  | { id: number; tur: 'arsivGoster'; sorgu: ArsivSorgusu }
  | { id: number; tur: 'arsivIslem'; islem: ArsivIslemi }
  | { id: number; tur: 'bayatKilidiKaldir' }
  | { id: number; tur: 'yedekDurumu' }
  | { id: number; tur: 'arsivDenetle' }
  | { id: number; tur: 'yedekAl'; hedef: string }
  | { id: number; tur: 'geriYukle'; yedek: string; kok: string };

/** Arşiv düzgün kapatılmamışsa hata metni bununla başlar; arayüz "Devam et" notunu gösterir. */
export const BAYAT_KILIT = 'bayat-kilit:';

export interface ArsivSorgusu {
  metin?: string;
  albumId?: number;
  etiket?: string; // motorun yolu: "Yer > Deniz"
  kutu?: boolean;
}

export interface ArsivOgesi {
  id: number;
  ad: string;
  tur: 'foto' | 'video';
  tarih: string | null; // ISO
  kaliciSilinme: string | null; // ISO; yalnız kutudakilerde
}

export interface ArsivGorunumu {
  ad: string;
  albumler: { id: number; ad: string; adet: number }[];
  etiketler: string[];
  kutuAdet: number;
  ogeler: ArsivOgesi[];
}

export type ArsivIslemi =
  | { islem: 'albumOlustur'; ad: string }
  | { islem: 'albumeEkle'; albumId: number; idler: number[] }
  | { islem: 'albumdenKaldir'; albumId: number; idler: number[] }
  | { islem: 'etiketle'; idler: number[]; yol: string }
  | { islem: 'kutuyaTasi'; idler: number[] }
  | { islem: 'kutudanGeriAl'; idler: number[] }
  | { islem: 'kaliciSil'; idler: number[] };

export interface YedekDurumu {
  yedek: { yol: string; zaman: string; dogrulandi: boolean } | null;
  saglik: { zaman: string; denetlenen: number; saglam: number; sorun: number } | null;
}

/** Bilinen (son kullanılan) arşiv. `ad` yalnız arşiv şu an erişilebilirse dolu (disk takılı değilse null). */
export interface ArsivDurumuCevabi {
  kok: string | null;
  ad: string | null;
}

export interface ArsivAlimSonucu {
  kok: string;
  ad: string;
  yeni: number; // arşive yeni giren dosya
  zaten: number; // içeriği zaten arşivde olan (tek kopya saklanır)
  hata: number;
  durduruldu: boolean;
}

/** Kayıt dosyası bozuk çıkıp kenara alındıysa o dosyanın yolu (silinmez); yoksa null. Bir kez döner. */
export interface KatalogDurumuCevabi {
  kurtarilan: string | null;
}

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
  | { tur: 'aktarim'; bitti: number; toplam: number }
  | { tur: 'arsivAlim'; bitti: number; toplam: number; zaten: number }
  | { tur: 'arsivIs'; ad: 'yedek' | 'denetim'; bitti: number; toplam: number };

export type IsciCevabi = { id: number; tamam: true; veri: unknown } | { id: number; tamam: false; hata: string };

/** İşçinin ana sürece yolladığı her şey */
export type IsciMesaji = { tur: 'cevap'; cevap: IsciCevabi } | { tur: 'olay'; olay: ArayuzOlayi };

export function arayuzIcin(m: IslenmisMedya, renk: string): ArayuzMedya {
  const { vektor: _vektor, ...geri } = m;
  return { ...geri, renk };
}
