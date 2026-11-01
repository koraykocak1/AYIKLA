export type MedyaTuru = 'foto' | 'video';

export interface MedyaDosyasi {
  yol: string;
  tur: MedyaTuru;
  boyut: number;
  degisme: number; // mtimeMs
}

export type TarihKaynagi = 'exif' | 'video' | 'takeout' | 'dosya-adi' | 'dosya-tarihi' | 'komsu';

export interface TarihSonucu {
  tarih: Date;
  kaynak: TarihKaynagi;
  tahmini: boolean;
}

export interface KaliteSonucu {
  netlik: number;
  parlaklik: number;
  bulanik: boolean;
  karanlik: boolean;
  aydinlik?: number; // en parlak %2'lik dilimin parlaklığı (0-255); eski kayıtlarda yok
}

export interface Grup {
  id: string;
  ad: string;
  tarifler: string[]; // CLIP'e verilen İngilizce tarifler
  kullanici?: boolean;
  ingilizce?: string; // kullanıcı grubunun İngilizce karşılığı (tarifler bundan üretilir)
}

export type ElemeNedeni = 'kopya' | 'bulanik' | 'karanlik';

export interface IslenmisMedya {
  anahtar: string;
  yol: string;
  tur: MedyaTuru;
  boyut: number;
  degisme: number;
  tarih: string; // ISO
  tarihKaynagi: TarihKaynagi;
  tahmini: boolean;
  onizlemeler: string[];
  genislik: number;
  yukseklik: number;
  kalite: KaliteSonucu;
  parmakizi: string; // 16 haneli hex
  vektor: number[]; // normalize CLIP vektörü
  grupId: string;
  eleme: ElemeNedeni | null;
  elleGrup?: string;
  geriAlindi?: boolean; // kullanıcı "Geri al" dedi: elenmez
  renk?: string; // kartın rengi (#rrggbb), animasyon için
  ham?: string[]; // aynı karenin RAW (NEF) eşleri: ayrıca gösterilmez, dışa aktarırken yanına kopyalanır
}

export interface SahneModeli {
  cihaz: string;
  resimVektoru(yol: string): Promise<number[]>;
  metinVektorleri(metinler: string[]): Promise<number[][]>;
}

export type IsciOlayi =
  | { tur: 'basladi'; toplam: number }
  | { tur: 'dosya'; medya: IslenmisMedya; sira: number; toplam: number }
  | { tur: 'okunamadi'; yol: string; hata: string }
  | { tur: 'kopyalar'; anahtarlar: string[] }
  | { tur: 'bitti'; sonuc: IslenmisMedya[] };

export interface SonArsiv {
  girdiler: string[];
  tarih: string; // ISO
  foto: number;
  video: number;
}
